import { prisma } from "../lib/db.js";
import { normalizeVnPhone } from "../lib/sms.js";

// So dia chi toi da moi nguoi dung (giong Shopee)
export const MAX_ADDRESSES = 10;

const LIMITS = { name: 100, street: 255, province: 100, district: 100, ward: 100 };

// Chuan hoa + kiem tra dau vao. partial=true (PATCH) chi kiem tra truong duoc gui.
// Tra { ok:true, data } hoac { ok:false, code:"INVALID", message }.
export const validateAddress = (body, partial = false) => {
  const src = body && typeof body === "object" ? body : {};
  const data = {};
  for (const key of ["name", "street", "province", "district", "ward"]) {
    if (src[key] === undefined) {
      if (!partial && (key === "name" || key === "street")) {
        return { ok: false, code: "INVALID", message: `${key} is required` };
      }
      continue;
    }
    if (src[key] !== null && typeof src[key] !== "string") {
      return { ok: false, code: "INVALID", message: `${key} must be a string` };
    }
    const v = (src[key] ?? "").trim();
    const required = key === "name" || key === "street";
    if (required && !v) return { ok: false, code: "INVALID", message: `${key} is required` };
    if (v.length > LIMITS[key]) {
      return { ok: false, code: "INVALID", message: `${key} must be at most ${LIMITS[key]} characters` };
    }
    data[key] = required ? v : v || null;
  }
  if (src.phone !== undefined || !partial) {
    const phone = normalizeVnPhone(src.phone);
    if (!phone) return { ok: false, code: "INVALID", message: "Invalid phone number" };
    data.phone = phone;
  }
  return { ok: true, data };
};

const ownWhere = (userId) => ({ user_id: BigInt(userId), deleted_at: null });

export const listAddresses = (userId) =>
  prisma.userAddress.findMany({
    where: ownWhere(userId),
    orderBy: [{ is_default: "desc" }, { created_at: "desc" }],
  });

// Chi tra ve dia chi cua chinh user; khong phan biet "khong ton tai" va "cua nguoi khac" (chong IDOR)
const findOwn = (userId, id) =>
  prisma.userAddress.findFirst({ where: { ...ownWhere(userId), id: BigInt(id) } });

const NOT_FOUND = { ok: false, code: "NOT_FOUND", message: "Address not found" };

// Khoa dong user trong giao dich: hai request song song cua cung mot nguoi chay
// tuan tu, khong vuot gioi han 10 hay tao ra hai dia chi mac dinh
const lockUser = (tx, userId) =>
  tx.$queryRaw`SELECT id FROM users WHERE id = ${BigInt(userId)} FOR UPDATE`;

export const createAddress = async (userId, body) => {
  const v = validateAddress(body);
  if (!v.ok) return v;
  return prisma.$transaction(async (tx) => {
    await lockUser(tx, userId);
    const count = await tx.userAddress.count({ where: ownWhere(userId) });
    if (count >= MAX_ADDRESSES) {
      return { ok: false, code: "LIMIT", message: `You can save up to ${MAX_ADDRESSES} addresses` };
    }
    // Dia chi dau tien tu thanh mac dinh
    const address = await tx.userAddress.create({
      data: { ...v.data, user_id: BigInt(userId), is_default: count === 0 },
    });
    return { ok: true, address };
  });
};

export const updateAddress = async (userId, id, body) => {
  const v = validateAddress(body, true);
  if (!v.ok) return v;
  if (!(await findOwn(userId, id))) return NOT_FOUND;
  const address = await prisma.userAddress.update({ where: { id: BigInt(id) }, data: v.data });
  return { ok: true, address };
};

// Xoa mem; neu la mac dinh thi day dia chi moi nhat con lai len lam mac dinh
export const deleteAddress = (userId, id) =>
  prisma.$transaction(async (tx) => {
    await lockUser(tx, userId);
    const own = await tx.userAddress.findFirst({ where: { ...ownWhere(userId), id: BigInt(id) } });
    if (!own) return NOT_FOUND;
    await tx.userAddress.update({
      where: { id: own.id },
      data: { deleted_at: new Date(), is_default: false },
    });
    if (own.is_default) {
      const next = await tx.userAddress.findFirst({
        where: ownWhere(userId),
        orderBy: { created_at: "desc" },
      });
      if (next) await tx.userAddress.update({ where: { id: next.id }, data: { is_default: true } });
    }
    return { ok: true };
  });

// Dung mot giao dich de luon chi co dung mot dia chi mac dinh
export const setDefaultAddress = (userId, id) =>
  prisma.$transaction(async (tx) => {
    await lockUser(tx, userId);
    const own = await tx.userAddress.findFirst({ where: { ...ownWhere(userId), id: BigInt(id) } });
    if (!own) return NOT_FOUND;
    await tx.userAddress.updateMany({
      where: { ...ownWhere(userId), is_default: true, id: { not: own.id } },
      data: { is_default: false },
    });
    const address = await tx.userAddress.update({ where: { id: own.id }, data: { is_default: true } });
    return { ok: true, address };
  });
