import { asyncHandler } from "../middleware/error.middleware.js";
import { parsePagination, buildPaginationMeta } from "../lib/pagination.js";
import { ROLES } from "../constants/roles.js";
import {
  listProductQuestions,
  askQuestion,
  answerQuestion,
  deleteQuestion,
  listShopQuestions,
  ProductQuestionError,
} from "../services/productQuestion.service.js";

const run = (fn, status = 200) =>
  asyncHandler(async (req, res) => {
    try {
      return res.status(status).json({ success: true, data: await fn(req) });
    } catch (err) {
      if (err instanceof ProductQuestionError) {
        return res.status(err.status).json({ success: false, error: err.message });
      }
      throw err;
    }
  });

const paged = async (req, fn) => {
  const { skip, take, currentPage, perPage } = parsePagination(req.query.page ?? 1, req.query.limit ?? 10);
  const { total, questions } = await fn({ skip, take });
  return { questions, pagination: buildPaginationMeta(currentPage, perPage, total) };
};

// GET /api/products/:id/questions - cong khai
export const getProductQuestions = run((req) =>
  paged(req, (page) => listProductQuestions(BigInt(req.params.id), page))
);

// POST /api/products/:id/questions { question }
export const postProductQuestion = run(
  (req) => askQuestion(BigInt(req.user.id), BigInt(req.params.id), req.body),
  201
);

// PUT /api/product-questions/:id/answer { answer } - chu shop (admin khong co req.shop)
export const putAnswer = run((req) => {
  if (!req.shop) throw new ProductQuestionError(403, "Only the shop owner can answer");
  return answerQuestion(req.shop, BigInt(req.params.id), req.body);
});

// DELETE /api/product-questions/:id - nguoi hoi hoac admin
export const removeQuestion = run((req) =>
  deleteQuestion(BigInt(req.user.id), req.user.role === ROLES.ADMIN, BigInt(req.params.id))
);

// GET /api/product-questions/shop/mine?filter=unanswered
export const getShopQuestions = run((req) => {
  if (!req.shop) throw new ProductQuestionError(403, "Seller shop required");
  return paged(req, (page) => listShopQuestions(req.shop.id, req.query.filter, page));
});
