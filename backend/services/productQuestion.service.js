import { prisma } from "../lib/db.js";
import { SHOP_STATUS } from "../constants/status.js";
import { notifyUser } from "../lib/notify.js";
import { createSlug } from "../lib/slug.js";

export const MAX_QUESTION = 500;
export const MAX_ANSWER = 1000;
// Chong spam: mot nguoi co toi da chung nay cau hoi chua tra loi tren mot san pham
export const MAX_OPEN_PER_PRODUCT = 3;

// Loi nghiep vu co status de controller map ra HTTP (service khong biet res)
export class ProductQuestionError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const productLink = (p) => `/product/${createSlug(p.name) || "product"}-p${p.id}#questions`;

const publicSelect = {
  id: true,
  question: true,
  answer: true,
  answered_at: true,
  created_at: true,
  user: { select: { id: true, name: true } },
};

const cleanText = (value, max, label) => {
  if (typeof value !== "string") throw new ProductQuestionError(400, `${label} is required`);
  const text = value.trim();
  if (text.length < 5 || text.length > max) {
    throw new ProductQuestionError(400, `${label} must be 5-${max} characters`);
  }
  return text;
};

// Danh sach cong khai: cau da tra loi len truoc, moi nhat truoc
export const listProductQuestions = async (productId, { skip, take }) => {
  const exists = await prisma.product.findFirst({
    where: { id: productId, deleted_at: null },
    select: { id: true },
  });
  if (!exists) throw new ProductQuestionError(404, "Product not found");
  const where = { product_id: productId };
  const [total, questions] = await Promise.all([
    prisma.productQuestion.count({ where }),
    prisma.productQuestion.findMany({
      where,
      orderBy: [{ answered_at: { sort: "desc", nulls: "last" } }, { created_at: "desc" }],
      select: publicSelect,
      skip,
      take,
    }),
  ]);
  return { total, questions };
};

export const askQuestion = async (userId, productId, body) => {
  const question = cleanText(body?.question, MAX_QUESTION, "Question");
  // Chi hoi duoc tren san pham nguoi mua dang thay
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      deleted_at: null,
      is_active: true,
      shop: { status: SHOP_STATUS.ACTIVE, deleted_at: null },
    },
    select: { id: true, name: true, shop: { select: { owner_id: true } } },
  });
  if (!product) throw new ProductQuestionError(404, "Product not found");
  if (product.shop.owner_id === userId) {
    throw new ProductQuestionError(400, "You cannot ask about your own product");
  }
  const open = await prisma.productQuestion.count({
    where: { product_id: productId, user_id: userId, answer: null },
  });
  if (open >= MAX_OPEN_PER_PRODUCT) {
    throw new ProductQuestionError(429, "Please wait for the shop to answer your previous questions");
  }
  const created = await prisma.productQuestion.create({
    data: { product_id: productId, user_id: userId, question },
    select: publicSelect,
  });
  notifyUser({
    userId: product.shop.owner_id,
    title: "New question about your product",
    message: `A buyer asked about ${product.name}: "${question.slice(0, 120)}"`,
    type: "SYSTEM",
    link: "/seller/questions?filter=unanswered",
  });
  return created;
};

// Chu shop tra loi (sua duoc); chi bao nguoi hoi o lan tra loi dau
export const answerQuestion = async (shop, questionId, body) => {
  const answer = cleanText(body?.answer, MAX_ANSWER, "Answer");
  const q = await prisma.productQuestion.findFirst({
    where: { id: questionId, product: { shop_id: shop.id } },
    select: { id: true, user_id: true, answer: true, product: { select: { id: true, name: true } } },
  });
  if (!q) throw new ProductQuestionError(404, "Question not found");
  const updated = await prisma.productQuestion.update({
    where: { id: q.id },
    data: { answer, answered_at: new Date() },
    select: publicSelect,
  });
  if (!q.answer) {
    notifyUser({
      userId: q.user_id,
      title: "The shop answered your question",
      message: `${shop.name} answered your question about ${q.product.name}`,
      type: "SYSTEM",
      link: productLink(q.product),
    });
  }
  return updated;
};

// Nguoi hoi xoa cau hoi cua minh; admin xoa bat ky cau nao (noi dung vi pham)
export const deleteQuestion = async (userId, isAdmin, questionId) => {
  const q = await prisma.productQuestion.findUnique({
    where: { id: questionId },
    select: { id: true, user_id: true },
  });
  if (!q || (!isAdmin && q.user_id !== userId)) {
    throw new ProductQuestionError(404, "Question not found");
  }
  await prisma.productQuestion.delete({ where: { id: q.id } });
  return { id: q.id };
};

// Hop thu cau hoi cua shop: filter=unanswered de lam viec can xu ly
export const listShopQuestions = async (shopId, filter, { skip, take }) => {
  const where = {
    product: { shop_id: shopId },
    ...(filter === "unanswered" && { answer: null }),
  };
  const [total, questions] = await Promise.all([
    prisma.productQuestion.count({ where }),
    prisma.productQuestion.findMany({
      where,
      orderBy: { created_at: "desc" },
      select: { ...publicSelect, product: { select: { id: true, name: true, img: true } } },
      skip,
      take,
    }),
  ]);
  return { total, questions };
};

export const countUnansweredForShop = (shopId) =>
  prisma.productQuestion.count({ where: { answer: null, product: { shop_id: shopId } } });
