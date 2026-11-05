import { prisma } from "../lib/db.js";
import cloudinary from "../lib/cloudinary.js";
import { writeAuditLog } from "../services/audit.service.js";
import { notifyUser } from "../lib/notify.js";
import { ROLES } from "../constants/roles.js";
import { createSlug, ensureUniqueSlug } from "../lib/slug.js";
import { parsePagination, buildPaginationMeta } from "../lib/pagination.js";
import { SHOP_STATUS } from "../constants/status.js";
import { asyncHandler } from "../middleware/error.middleware.js";

export { SHOP_STATUS } from "../constants/status.js";

const shopPublicSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  logo_url: true,
  banner_url: true,
  status: true,
  address: true,
  created_at: true,
};

const maybeUploadImages = async (req) => {
  const urls = {};
  const files = req.files || {};
  const uploadOne = async (file, folder) => {
    const result = await cloudinary.uploader.upload(file.path, { folder });
    return result.secure_url;
  };
  if (files.logo?.[0]) {
    urls.logo_url = await uploadOne(files.logo[0], "shops/logos");
  }
  if (files.banner?.[0]) {
    urls.banner_url = await uploadOne(files.banner[0], "shops/banners");
  }
  return urls;
};

// POST /api/shops/apply — any logged-in user applies to open a shop
export const applyForShop = asyncHandler(async (req, res) => {
  const userId = BigInt(req.user.id);
  const { name, description, contact_email, contact_phone, address } =
    req.body || {};

  if (!name || !String(name).trim()) {
    return res
      .status(400)
      .json({ success: false, error: "Shop name is required" });
  }

  const existing = await prisma.shop.findUnique({
    where: { owner_id: userId },
  });
  if (existing) {
    return res.status(400).json({
      success: false,
      error: "You already have a shop application/shop",
      data: { status: existing.status },
    });
  }

  const slug = await ensureUniqueSlug(prisma.shop, createSlug(name));
  const imageUrls = await maybeUploadImages(req);

  const shop = await prisma.shop.create({
    data: {
      owner_id: userId,
      name: String(name).trim(),
      slug,
      description: description ? String(description).trim() : null,
      contact_email: contact_email || req.user.email || null,
      contact_phone: contact_phone || req.user.phone || null,
      address: address || req.user.address || null,
      status: SHOP_STATUS.PENDING,
      ...imageUrls,
    },
  });

  writeAuditLog({
    userId: req.user.id,
    action: "SHOP_APPLY",
    resource: "shop",
    resourceId: shop.id,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    metadata: { name: shop.name, slug: shop.slug },
  });

  return res.status(201).json({ success: true, data: shop });
});

// GET /api/shops/me — the caller's own shop, any status
export const getMyShop = asyncHandler(async (req, res) => {
  const shop = await prisma.shop.findUnique({
    where: { owner_id: BigInt(req.user.id) },
  });
  if (!shop || shop.deleted_at) {
    return res
      .status(404)
      .json({ success: false, error: "You do not have a shop yet" });
  }
  return res.json({ success: true, data: shop });
});

// Tra thong bao loi neu MST / loai hinh thue khong hop le, nguoc lai null.
const validateTax = (tax_code, tax_entity_type) => {
  if (tax_entity_type !== undefined && !["household", "company"].includes(tax_entity_type)) {
    return "tax_entity_type must be 'household' or 'company'";
  }
  if (tax_code !== undefined && tax_code !== null && tax_code !== "" && !/^\d{10}(-\d{3})?$/.test(String(tax_code).trim())) {
    return "tax_code must be 10 digits (or 13 digits with -XXX branch suffix)";
  }
  return null;
};

// PATCH /api/shops/me — owner edits profile; a rejected application is
// resubmitted (status back to pending). Ownership via owner_id, not role,
// so pending/rejected applicants (still role "user") can edit too.
export const updateMyShop = asyncHandler(async (req, res) => {
  const shop = await prisma.shop.findUnique({
    where: { owner_id: BigInt(req.user.id) },
  });
  if (!shop || shop.deleted_at) {
    return res
      .status(404)
      .json({ success: false, error: "You do not have a shop yet" });
  }

  const {
    name,
    description,
    contact_email,
    contact_phone,
    address,
    shipping_fee_override,
    free_shipping_threshold_override,
    pickup_province,
    pickup_district,
    pickup_ward,
    pickup_address,
    tax_code,
    tax_entity_type,
  } = req.body || {};

  const taxError = validateTax(tax_code, tax_entity_type);
  if (taxError) return res.status(400).json({ success: false, error: taxError });
  // Shop da duyet: doi MST/loai hinh anh huong hoa don da phat hanh nen phai qua admin
  const taxChanged =
    (tax_code !== undefined && (String(tax_code ?? "").trim() || null) !== (shop.tax_code || null)) ||
    (tax_entity_type !== undefined && tax_entity_type !== shop.tax_entity_type);
  if (shop.status === SHOP_STATUS.ACTIVE && taxChanged) {
    return res.status(403).json({ success: false, error: "Tax info changes require admin review" });
  }
  // "" xoa gia tri; undefined = khong doi
  const text = (v, max) => (v === undefined ? undefined : String(v ?? "").trim().slice(0, max) || null);

  let slug;
  if (name && String(name).trim() && String(name).trim() !== shop.name) {
    slug = await ensureUniqueSlug(prisma.shop, createSlug(name), shop.id);
  }

  const imageUrls = await maybeUploadImages(req);

  const resubmitting = shop.status === SHOP_STATUS.REJECTED;

  // "" clears an override (falls back to platform default); undefined = untouched
  const parseOverride = (v) => {
    if (v === undefined) return undefined;
    if (v === null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };

  const updated = await prisma.shop.update({
    where: { id: shop.id },
    data: {
      name: name ? String(name).trim() : undefined,
      slug: slug ?? undefined,
      description: description !== undefined ? description : undefined,
      contact_email: contact_email ?? undefined,
      contact_phone: contact_phone ?? undefined,
      address: address ?? undefined,
      shipping_fee_override: parseOverride(shipping_fee_override),
      free_shipping_threshold_override: parseOverride(
        free_shipping_threshold_override
      ),
      pickup_province: text(pickup_province, 100),
      pickup_district: text(pickup_district, 100),
      pickup_ward: text(pickup_ward, 100),
      pickup_address: text(pickup_address, 255),
      tax_code: text(tax_code, 20),
      tax_entity_type,
      ...imageUrls,
      ...(resubmitting && {
        status: SHOP_STATUS.PENDING,
        rejection_reason: null,
      }),
    },
  });

  writeAuditLog({
    userId: req.user.id,
    action: resubmitting ? "SHOP_RESUBMIT" : "SHOP_UPDATE",
    resource: "shop",
    resourceId: shop.id,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  return res.json({ success: true, data: updated });
});

// GET /api/shops — public browse list (active shops only)
export const listShops = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const { currentPage, perPage, skip } = parsePagination(page, limit);

  const where = {
    status: SHOP_STATUS.ACTIVE,
    deleted_at: null,
    ...(search && {
      name: { contains: String(search), mode: "insensitive" },
    }),
  };

  const [total, shops] = await Promise.all([
    prisma.shop.count({ where }),
    prisma.shop.findMany({
      where,
      select: {
        ...shopPublicSelect,
        _count: { select: { products: { where: { deleted_at: null } } } },
      },
      orderBy: { created_at: "desc" },
      skip,
      take: perPage,
    }),
  ]);

  return res.json({
    success: true,
    data: {
      shops,
      pagination: buildPaginationMeta(currentPage, perPage, total),
    },
  });
});

// GET /api/shops/:slug — public shop profile. Non-active shops are only
// visible to their owner or an admin (preview).
export const getShopBySlug = asyncHandler(async (req, res) => {
  const shop = await prisma.shop.findFirst({
    where: { slug: req.params.slug, deleted_at: null },
    select: {
      ...shopPublicSelect,
      owner_id: true,
      contact_email: true,
      contact_phone: true,
      _count: { select: { products: { where: { deleted_at: null } } } },
    },
  });

  const isOwner =
    req.user && shop && shop.owner_id.toString() === req.user.id;
  const isAdmin = req.user?.role === ROLES.ADMIN;

  if (
    !shop ||
    (shop.status !== SHOP_STATUS.ACTIVE && !isOwner && !isAdmin)
  ) {
    return res
      .status(404)
      .json({ success: false, error: "Shop not found" });
  }

  // Aggregate rating across the shop's products
  const ratingAgg = await prisma.review.aggregate({
    where: { product: { shop_id: shop.id }, deleted_at: null },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const { owner_id, ...publicShop } = shop;
  return res.json({
    success: true,
    data: {
      ...publicShop,
      is_owner: Boolean(isOwner),
      rating: ratingAgg._avg.rating
        ? Number(ratingAgg._avg.rating.toFixed(1))
        : null,
      review_count: ratingAgg._count.rating || 0,
    },
  });
});

// GET /api/shops/admin/all — moderation queue (any status)
export const adminListShops = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  const { currentPage, perPage, skip } = parsePagination(page, limit);

  const where = {
    deleted_at: null,
    ...(status && { status: String(status) }),
    ...(search && {
      OR: [
        { name: { contains: String(search), mode: "insensitive" } },
        { slug: { contains: String(search), mode: "insensitive" } },
        {
          owner: {
            email: { contains: String(search), mode: "insensitive" },
          },
        },
      ],
    }),
  };

  const [total, shops, statusCounts] = await Promise.all([
    prisma.shop.count({ where }),
    prisma.shop.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
        _count: { select: { products: true, orders: true } },
      },
      orderBy: { created_at: "desc" },
      skip,
      take: perPage,
    }),
    prisma.shop.groupBy({
      by: ["status"],
      where: { deleted_at: null },
      _count: { _all: true },
    }),
  ]);

  return res.json({
    success: true,
    data: {
      shops,
      status_counts: Object.fromEntries(
        statusCounts.map((s) => [s.status, s._count._all])
      ),
      pagination: buildPaginationMeta(currentPage, perPage, total),
    },
  });
});

// PATCH /api/shops/admin/:id/approve — activate shop + promote owner to seller
export const approveShop = asyncHandler(async (req, res) => {
  const shopId = BigInt(req.params.id);
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop || shop.deleted_at) {
    return res.status(404).json({ success: false, error: "Shop not found" });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const s = await tx.shop.update({
      where: { id: shopId },
      data: {
        status: SHOP_STATUS.ACTIVE,
        rejection_reason: null,
        approved_at: new Date(),
        approved_by: BigInt(req.user.id),
      },
    });
    // Promote the owner so seller-dashboard routes open up. Never demote
    // an admin who happens to own a shop.
    await tx.user.updateMany({
      where: { id: shop.owner_id, role: { not: ROLES.ADMIN } },
      data: { role: ROLES.SELLER },
    });
    return s;
  });

  writeAuditLog({
    userId: req.user.id,
    action: "SHOP_APPROVE",
    resource: "shop",
    resourceId: shopId,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  notifyUser({
    userId: shop.owner_id,
    title: "Shop approved 🎉",
    message: `Your shop "${shop.name}" has been approved. You can now manage it from the Seller Dashboard.`,
    type: "SHOP",
  });

  return res.json({ success: true, data: updated });
});

// PATCH /api/shops/admin/:id/reject — reject with reason
export const rejectShop = asyncHandler(async (req, res) => {
  const shopId = BigInt(req.params.id);
  const { reason } = req.body || {};
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop || shop.deleted_at) {
    return res.status(404).json({ success: false, error: "Shop not found" });
  }

  const updated = await prisma.shop.update({
    where: { id: shopId },
    data: {
      status: SHOP_STATUS.REJECTED,
      rejection_reason: reason ? String(reason).trim() : null,
    },
  });

  writeAuditLog({
    userId: req.user.id,
    action: "SHOP_REJECT",
    resource: "shop",
    resourceId: shopId,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    metadata: { reason: reason || null },
  });

  notifyUser({
    userId: shop.owner_id,
    title: "Shop application rejected",
    message: `Your shop application "${shop.name}" was rejected${
      reason ? `: ${reason}` : "."
    } You can update your application and resubmit.`,
    type: "SHOP",
  });

  return res.json({ success: true, data: updated });
});

// PATCH /api/shops/:id/tax - admin doi MST/loai hinh thue cua shop da duyet
export const adminUpdateShopTax = asyncHandler(async (req, res) => {
  const shopId = BigInt(req.params.id);
  const { tax_code, tax_entity_type } = req.body || {};
  const taxError = validateTax(tax_code, tax_entity_type);
  if (taxError) return res.status(400).json({ success: false, error: taxError });
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop || shop.deleted_at) {
    return res.status(404).json({ success: false, error: "Shop not found" });
  }
  const updated = await prisma.shop.update({
    where: { id: shopId },
    data: {
      tax_code: tax_code === undefined ? undefined : String(tax_code ?? "").trim().slice(0, 20) || null,
      tax_entity_type,
    },
  });
  writeAuditLog({
    userId: req.user.id,
    action: "SHOP_TAX_UPDATE",
    resource: "shop",
    resourceId: shopId,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    metadata: {
      from: { tax_code: shop.tax_code, tax_entity_type: shop.tax_entity_type },
      to: { tax_code: updated.tax_code, tax_entity_type: updated.tax_entity_type },
    },
  });
  return res.json({ success: true, data: updated });
});

// PATCH /api/shops/admin/:id/suspend — hide shop's catalog from buyers
export const suspendShop = asyncHandler(async (req, res) => {
  const shopId = BigInt(req.params.id);
  const { reason } = req.body || {};
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop || shop.deleted_at) {
    return res.status(404).json({ success: false, error: "Shop not found" });
  }

  const updated = await prisma.shop.update({
    where: { id: shopId },
    data: {
      status: SHOP_STATUS.SUSPENDED,
      rejection_reason: reason ? String(reason).trim() : null,
    },
  });

  writeAuditLog({
    userId: req.user.id,
    action: "SHOP_SUSPEND",
    resource: "shop",
    resourceId: shopId,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    metadata: { reason: reason || null },
  });

  notifyUser({
    userId: shop.owner_id,
    title: "Shop suspended",
    message: `Your shop "${shop.name}" has been suspended${
      reason ? `: ${reason}` : "."
    } Its products are hidden from buyers. Contact support for details.`,
    type: "SHOP",
  });

  return res.json({ success: true, data: updated });
});
