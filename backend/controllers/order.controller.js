import { prisma } from "../lib/db.js";
import { earnPointsForOrder } from "../services/loyalty.service.js";
import { writeAuditLog } from "../services/audit.service.js";
import { notifyUser } from "../lib/notify.js";
import { ROLES } from "../constants/roles.js";
import {
  SHOP_STATUS,
  ORDER_STATUS,
  ORDER_STATUS_FLOW,
  FINAL_ORDER_STATUSES,
  BUYER_CANCELLABLE_STATUSES,
} from "../constants/status.js";
import { getSettingNumber } from "../lib/settings.js";
import {
  actorFromReq,
  cancelInTx,
  logRefundOwed,
  transitionOrderStatus,
} from "../services/orderLifecycle.service.js";
import { quoteShippingForGroups } from "../services/shipping/index.js";
import {
  assessCheckoutRisk,
  recordCheckoutRisk,
} from "../services/fraud.service.js";

// Quy tac tinh tien nam o services/pricing.service.js. Controller nay chi con
// lo phan doc du lieu, kiem tra quyen, ghi don va tra ve HTTP.
import {
  round2,
  TIER_AUTO_DISCOUNT_RATE,
  getTierFromPoints,
  groupItemsByShop,
  computeTierDiscount,
  resolveCouponDiscount,
  allocateMerchandise,
  merchandiseTotalAfterDiscounts,
} from "../services/pricing.service.js";
import { parsePagination } from "../lib/pagination.js";
import { asyncHandler } from "../middleware/error.middleware.js";

const HTTP_BY_CODE = { NOT_FOUND: 404, INVALID_TRANSITION: 400, CONFLICT: 409 };

// Yeu cau hoa don cong ty tu checkout: chi giu cac truong chuoi da biet, cat
// do dai - day la du lieu nguoi dung go, se in len hoa don.
const sanitizeInvoiceRequest = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const out = {};
  for (const key of ["company_name", "tax_code", "address", "email"]) {
    if (typeof raw[key] === "string" && raw[key].trim()) {
      out[key] = raw[key].trim().slice(0, 255);
    }
  }
  return out.company_name && out.tax_code ? out : null;
};

export const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      items,
      shipping_address,
      payment_method,
      coupon_code,
      invoice_request,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No order items provided" });
    }

    let totalAmount = 0;
    // One entry per cart item: { data (OrderItem row), color, shopId }
    const preparedItems = [];
    for (const it of items) {
      const product = await prisma.product.findFirst({
        where: { id: BigInt(it.product_id), deleted_at: null },
        include: {
          product_colors: true,
          variants: { where: { deleted_at: null } },
          shop: {
            select: {
              id: true,
              name: true,
              status: true,
              owner_id: true,
              shipping_fee_override: true,
              free_shipping_threshold_override: true,
            },
          },
        },
      });
      if (!product)
        return res
          .status(400)
          .json({ message: `Product ${it.product_id} not found` });

      if (product.shop?.status !== SHOP_STATUS.ACTIVE) {
        return res.status(400).json({
          message: `"${product.name}" is no longer available (shop inactive)`,
        });
      }

      // Sellers cannot buy from their own shop (points/voucher farming)
      if (product.shop.owner_id.toString() === userId) {
        return res.status(400).json({
          message: `You cannot buy "${product.name}" from your own shop`,
        });
      }

      const colorVal =
        typeof it.color === "string"
          ? (() => {
              try {
                return JSON.parse(it.color);
              } catch {
                return { name: it.color, code: "" };
              }
            })()
          : it.color || null;

      // San pham co bien the thi bat buoc chon bien the, ton kho tinh theo bien the.
      let variant = null;
      if (product.variants.length > 0) {
        variant = product.variants.find(
          (v) => it.variant_id != null && v.id.toString() === String(it.variant_id)
        );
        if (!variant) {
          return res.status(400).json({
            message: `Valid variant required for product ${product.name}`,
          });
        }
        if (variant.quantity < it.quantity) {
          return res.status(400).json({
            message: `Insufficient stock for ${product.name} (${variant.name})`,
          });
        }
      }

      let productColor = null;
      if (colorVal && (colorVal.code || colorVal.name)) {
        productColor = product.product_colors.find(
          (c) =>
            (colorVal.code && c.code === colorVal.code) ||
            (colorVal.name && c.name === colorVal.name)
        );
        if (!productColor) {
          return res.status(400).json({
            message: `Color not available for product ${product.name}`,
          });
        }
        if (productColor.quantity < it.quantity) {
          return res.status(400).json({
            message: `Insufficient stock for color ${
              productColor.name || productColor.code
            }`,
          });
        }
      } else if (product.product_colors.length > 0 && !variant) {
        return res.status(400).json({
          message: `Color required for product ${product.name}`,
        });
      } else if (!variant) {
        if (product.quantity < it.quantity) {
          return res.status(400).json({
            message: `Insufficient stock for ${product.name}`,
          });
        }
      }

      // Charge the discounted price - matches what the cart displays
      const unitPrice = round2(
        Number(product.price) -
          Number(product.discount || 0) +
          Number(variant?.price_delta || 0)
      );
      const totalPrice = Number(unitPrice) * Number(it.quantity);
      totalAmount += totalPrice;
      preparedItems.push({
        data: {
          product_id: BigInt(it.product_id),
          variant_id: variant?.id ?? null,
          quantity: it.quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          color: colorVal ? JSON.stringify(colorVal) : null,
        },
        color: colorVal,
        productName: product.name,
        shop: product.shop,
        weightGrams: (product.weight_grams || 0) * Number(it.quantity),
      });
    }

    // Gom hang theo gian hang: moi shop se thanh mot don con doc lap.
    const shopGroups = groupItemsByShop(preparedItems);
    for (const group of shopGroups.values()) {
      group.weightGrams = group.items.reduce((s, it) => s + (it.weightGrams || 0), 0);
    }

    // Parse shipping_address if it's a string
    let parsedShippingAddress = shipping_address;
    if (typeof shipping_address === "string") {
      try {
        parsedShippingAddress = JSON.parse(shipping_address);
      } catch {
        parsedShippingAddress = shipping_address;
      }
    }

    // Phi van chuyen tinh rieng tung gian hang, mac dinh lay tu cau hinh san.
    const [platformShippingFee, platformFreeThreshold] = await Promise.all([
      getSettingNumber("shipping_fee", 9.99),
      getSettingNumber("free_shipping_threshold", 199),
    ]);
    // Che do "flat" (mac dinh) giu nguyen applyShopShipping; che do "carrier"
    // bao gia theo can nang + dia chi qua don vi van chuyen.
    const shippingTotal = await quoteShippingForGroups(shopGroups, {
      address: parsedShippingAddress,
      platformShippingFee,
      platformFreeThreshold,
    });

    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: { segment: true, loyalty_points: true },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userTier = user.segment || getTierFromPoints(user.loyalty_points || 0);
    const tierDiscountRate = TIER_AUTO_DISCOUNT_RATE[userTier] || 0;
    const tierResult = computeTierDiscount(totalAmount, tierDiscountRate);
    totalAmount = tierResult.totalAmount;
    const tierDiscount = tierResult.tierDiscount;
    const amountAfterTierDiscount = tierResult.amountAfterTierDiscount;

    // Voucher: quy tac tinh nam o service, tang nay chi doc DB va anh xa
    // ma loi cua service sang ma trang thai HTTP.
    let couponId = null;
    let couponDiscount = 0;
    let appliedCoupon = null;
    let couponShopKey = null;
    if (coupon_code) {
      const coupon = await prisma.coupon.findFirst({
        where: { code: coupon_code, deleted_at: null },
        include: {
          users: { select: { id: true } },
          shop: { select: { id: true, name: true } },
        },
      });

      const outcome = resolveCouponDiscount({
        coupon,
        shopGroups,
        tierDiscountRate,
        amountAfterTierDiscount,
        userId,
      });
      if (!outcome.ok) {
        const status = outcome.code === "COUPON_NOT_OWNED" ? 403 : 400;
        return res.status(status).json({ message: outcome.message });
      }

      couponDiscount = outcome.couponDiscount;
      couponShopKey = outcome.couponShopKey;
      couponId = coupon.id;
      appliedCoupon = coupon;
    }

    // Tien hang sau moi khoan giam; phi ship cong o tren cung, khong bi giam.
    const merchandiseTotal = merchandiseTotalAfterDiscounts(
      amountAfterTierDiscount,
      couponDiscount
    );
    const finalAmount = round2(merchandiseTotal + shippingTotal);

    const riskCtx = {
      userId,
      paymentMethod: payment_method ?? null,
      receiverPhone: parsedShippingAddress?.phone || null,
      address: parsedShippingAddress ?? null,
      coupon: appliedCoupon,
      clientIp: req.ip || null,
      deviceId: String(req.headers["x-device-id"] || "").slice(0, 100) || null,
      finalAmount,
      shopOwnerIds: [...shopGroups.values()].map((g) => g.shopOwnerId),
    };
    const risk = await assessCheckoutRisk(riskCtx);
    if (risk.block || risk.couponBlocked) {
      return res.status(403).json({
        message:
          risk.message ||
          (risk.couponBlocked
            ? "This voucher cannot be used with this account."
            : "This order cannot be placed. Please contact support."),
        code: risk.code || (risk.couponBlocked ? "COUPON_ABUSE" : "ORDER_BLOCKED"),
      });
    }

    // Phan bo tien hang cho tung don con. Bat bien: tong cac don con phai
    // bang dung finalAmount. Quy tac va phan hap thu sai so lam tron nam o
    // services/pricing.service.js, kiem thu rieng o tests/15-pricing.
    const groups = allocateMerchandise(shopGroups, {
      merchandiseTotal,
      totalAmount,
      tierDiscount,
      couponDiscount,
      couponShopKey,
    });

    const created = await prisma.$transaction(async (tx) => {
      const orderGroup = await tx.orderGroup.create({
        data: {
          user_id: BigInt(userId),
          group_number: `GRP-${Date.now()}`,
          subtotal_amount: round2(totalAmount),
          tier_discount: round2(tierDiscount),
          coupon_discount: round2(couponDiscount),
          shipping_fee: round2(shippingTotal),
          total_amount: round2(finalAmount),
          coupon_id: couponId,
          payment_method: payment_method ?? null,
          shipping_address: parsedShippingAddress ?? null,
          receiver_name: parsedShippingAddress?.name || null,
          receiver_phone: parsedShippingAddress?.phone || null,
          invoice_request: sanitizeInvoiceRequest(invoice_request),
          client_ip: riskCtx.clientIp,
          device_id: riskCtx.deviceId,
          risk_score: risk.score || 0,
        },
      });

      const createdOrders = [];
      for (const group of groups) {
        const createdOrder = await tx.order.create({
          data: {
            user_id: BigInt(userId),
            shop_id: group.shopId,
            order_group_id: orderGroup.id,
            order_number: `ORD-${Date.now()}-${group.shopId}`,
            total_amount: group.finalTotal,
            shipping_fee: group.shipping,
            status: ORDER_STATUS.PENDING,
            shipping_address: parsedShippingAddress ?? null,
            receiver_name: parsedShippingAddress?.name || null,
            receiver_phone: parsedShippingAddress?.phone || null,
            payment_method: payment_method ?? null,
            coupon_id: couponId,
            order_items: {
              createMany: { data: group.items.map((it) => it.data) },
            },
          },
          include: {
            order_items: true,
            shop: { select: { id: true, name: true, slug: true } },
          },
        });

        // Decrement stock and increment sold for this shop's items.
        // Conditional updates (quantity >= needed) make concurrent checkouts
        // safe: the slower buyer's transaction aborts instead of overselling.
        for (const item of group.items) {
          const it = item.data;
          const colorObj = item.color;
          if (it.variant_id) {
            const variantHit = await tx.productVariant.updateMany({
              where: { id: it.variant_id, quantity: { gte: it.quantity } },
              data: { quantity: { decrement: it.quantity } },
            });
            if (variantHit.count === 0) {
              throw new Error(`OUT_OF_STOCK:${item.productName}`);
            }
          }
          if (colorObj && (colorObj.code || colorObj.name)) {
            const colorHit = await tx.productColor.updateMany({
              where: {
                product_id: it.product_id,
                quantity: { gte: it.quantity },
                OR: [
                  colorObj.code ? { code: colorObj.code } : undefined,
                  colorObj.name ? { name: colorObj.name } : undefined,
                ].filter(Boolean),
              },
              data: { quantity: { decrement: it.quantity } },
            });
            if (colorHit.count === 0) {
              throw new Error(`OUT_OF_STOCK:${item.productName}`);
            }
          }
          const stockHit = await tx.product.updateMany({
            where: { id: it.product_id, quantity: { gte: it.quantity } },
            data: {
              quantity: { decrement: it.quantity },
              sold: { increment: it.quantity },
            },
          });
          if (stockHit.count === 0) {
            throw new Error(`OUT_OF_STOCK:${item.productName}`);
          }
        }

        // Cộng điểm theo từng đơn con, tính trên tiền hàng (không gồm phí ship)
        await earnPointsForOrder(
          tx,
          BigInt(userId),
          createdOrder.id,
          group.merchTotal
        );

        createdOrders.push(createdOrder);
      }

      // Chiem luot dung voucher - mot lan cho ca checkout, khong phai moi don con.
      //
      // Kiem tra usage_limit o phia tren chay TRUOC transaction, nen hai nguoi
      // mua bam cung luc deu doc thay "con luot" va deu di tiep. Chi cap nhat co
      // dieu kien ngay tai day moi chan duoc viec dung vuot han muc: PostgreSQL
      // danh gia lai WHERE sau khi giao dich truoc commit, nen nguoi den sau
      // khong khop dieu kien va nhan count = 0. Cung ky thuat da dung cho tru
      // ton kho o tren.
      if (appliedCoupon?.id) {
        const limit = appliedCoupon.usage_limit;
        const claimWhere = { id: appliedCoupon.id, deleted_at: null };
        if (limit !== null && limit !== undefined) {
          // used_count cho phep null trong schema; coi null la 0.
          claimWhere.OR = [{ used_count: null }, { used_count: { lt: limit } }];
        }
        const claimed = await tx.coupon.updateMany({
          where: claimWhere,
          data: { used_count: { increment: 1 } },
        });
        if (claimed.count === 0) {
          throw new Error(`COUPON_EXHAUSTED:${appliedCoupon.code}`);
        }
      }

      return { orderGroup, orders: createdOrders };
    });

    // Ghi co nghi van (neu co) ngoai giao dich: loi o day khong lam hong don.
    recordCheckoutRisk(created.orderGroup, risk, riskCtx).catch((err) =>
      console.error("[fraud] recordCheckoutRisk failed:", err?.message || err)
    );

    // Audit log + seller notifications per suborder
    for (const order of created.orders) {
      writeAuditLog({
        userId,
        action: "ORDER_CREATE",
        resource: "order",
        resourceId: order.id,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        metadata: {
          orderGroupId: created.orderGroup.id.toString(),
          groupNumber: created.orderGroup.group_number,
          shopId: order.shop_id.toString(),
          orderTotal: Number(order.total_amount),
          checkoutSubtotal: totalAmount,
          userTier,
          tierDiscountRate,
          tierDiscount,
          couponDiscount,
          finalAmount,
        },
      });
    }
    for (const group of groups) {
      notifyUser({
        userId: group.shopOwnerId,
        title: "New order 🛒",
        message: `${group.shopName} received a new order (${group.items.length} item${
          group.items.length > 1 ? "s" : ""
        }).`,
        type: "ORDER",
      });
    }

    res.status(201).json({
      message: "Order created successfully",
      order_group: created.orderGroup,
      orders: created.orders,
      subtotal: Number(totalAmount),
      amountAfterTierDiscount,
      tierDiscount,
      tierDiscountRate,
      discount: couponDiscount,
      shippingFee: round2(shippingTotal),
      finalAmount,
    });
  } catch (error) {
    // Raised by the conditional stock decrement when a concurrent checkout
    // took the last unit first
    if (String(error?.message || "").startsWith("OUT_OF_STOCK:")) {
      const name = error.message.slice("OUT_OF_STOCK:".length);
      return res.status(400).json({
        message: `"${name}" just sold out. Please review your cart.`,
      });
    }
    // Raised by the conditional voucher claim when a concurrent checkout took
    // the last remaining use first.
    if (String(error?.message || "").startsWith("COUPON_EXHAUSTED:")) {
      const code = error.message.slice("COUPON_EXHAUSTED:".length);
      return res.status(400).json({
        message: `Voucher "${code}" has reached its usage limit.`,
      });
    }
    res
      .status(500)
      .json({ message: "Failed to create order", error: error.message });
  }
};

export const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await prisma.order.findFirst({
    where: { id: BigInt(id), deleted_at: null },
    include: {
      user: { select: { id: true, name: true, email: true } },
      shop: { select: { id: true, name: true, slug: true, owner_id: true } },
      order_group: {
        select: { id: true, group_number: true, total_amount: true },
      },
      order_items: {
        include: { product: { select: { id: true, name: true, img: true } } },
      },
    },
  });

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  // Only the buyer, the selling shop's owner, or an admin may view an order
  const isBuyer = order.user_id.toString() === req.user.id;
  const isAdmin = req.user.role === ROLES.ADMIN;
  const isShopOwner = order.shop?.owner_id?.toString() === req.user.id;
  if (!isBuyer && !isAdmin && !isShopOwner) {
    return res.status(403).json({ message: "Not authorized" });
  }

  // owner_id was only needed for the authorization check above
  if (order.shop) {
    const { owner_id, ...publicShop } = order.shop;
    order.shop = publicShop;
  }

  res.json(order);
});

export const getUserOrders = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const orders = await prisma.order.findMany({
    where: { user_id: BigInt(userId), deleted_at: null },
    orderBy: { created_at: "desc" },
    include: {
      shop: { select: { id: true, name: true, slug: true } },
      order_group: { select: { id: true, group_number: true } },
      return_request: {
        select: { id: true, status: true, reason: true, resolution_note: true },
      },
      order_items: {
        include: {
          product: true,
        },
      },
    },
  });
  res.json(orders);
});

export const getAllOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, q, shop_id } = req.query;

  const where = { deleted_at: null };
  if (status) where.status = String(status);
  if (shop_id) where.shop_id = BigInt(shop_id);
  if (q) where.order_number = { contains: String(q), mode: "insensitive" };

  const { skip, take } = parsePagination(page, limit);

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: {
        order_items: true,
        user: { select: { id: true, name: true, email: true } },
        shop: { select: { id: true, name: true, slug: true } },
        order_group: { select: { id: true, group_number: true } },
      },
      skip,
      take,
    }),
  ]);

  res.json({
    orders,
    pagination: {
      current_page: Number(page),
      per_page: Number(limit),
      total_count: total,
      total_pages: Math.max(1, Math.ceil(total / Number(limit))),
    },
  });
});

// GET /api/orders/shop/mine — seller dashboard: own shop's orders only
export const getShopOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, q } = req.query;

  if (!req.shop) {
    return res.status(400).json({
      message: "No shop attached to this account; use admin list instead",
    });
  }

  const where = { shop_id: req.shop.id, deleted_at: null };
  if (status) where.status = String(status);
  if (q) where.order_number = { contains: String(q), mode: "insensitive" };

  const { skip, take } = parsePagination(page, limit);

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: {
        order_items: {
          include: {
            product: { select: { id: true, name: true, img: true } },
          },
        },
        user: { select: { id: true, name: true, email: true } },
        order_group: { select: { id: true, group_number: true } },
      },
      skip,
      take,
    }),
  ]);

  res.json({
    orders,
    pagination: {
      current_page: Number(page),
      per_page: Number(limit),
      total_count: total,
      total_pages: Math.max(1, Math.ceil(total / Number(limit))),
    },
  });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // "returned" khong nam trong danh sach: chi luong tra hang moi dat duoc.
  const validStatuses = [
    ORDER_STATUS.PENDING,
    ORDER_STATUS.PROCESSING,
    ORDER_STATUS.SHIPPED,
    ORDER_STATUS.DELIVERED,
    ORDER_STATUS.CANCELLED,
  ];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const result = await transitionOrderStatus({
    orderId: id,
    status,
    actor: actorFromReq(req),
  });
  if (!result.ok) {
    return res.status(HTTP_BY_CODE[result.code] || 400).json({ message: result.message });
  }

  res.json({
    message: "Order status updated successfully",
    order: result.order,
  });
});

export const deleteOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await prisma.order.findFirst({
    where: { id: BigInt(id), deleted_at: null },
    include: { order_items: true },
  });
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (order.status !== ORDER_STATUS.PENDING) {
    return res
      .status(400)
      .json({ message: "Cannot delete order in current status" });
  }

  let refundOwed = null;
  try {
    await prisma.$transaction(async (tx) => {
      // Re-check status atomically - closes the gap between the read
      // above and this write so two concurrent deletes can't both
      // restock/revert points for the same order.
      const claimed = await tx.order.updateMany({
        where: {
          id: BigInt(id),
          status: ORDER_STATUS.PENDING,
          deleted_at: null,
        },
        data: { deleted_at: new Date() },
      });
      if (claimed.count === 0) {
        throw new Error("ORDER_ALREADY_RESOLVED");
      }
      refundOwed = await cancelInTx(tx, order);
    });
  } catch (err) {
    if (err.message === "ORDER_ALREADY_RESOLVED") {
      return res
        .status(409)
        .json({ message: "Order was already updated by another request" });
    }
    throw err;
  }

  logRefundOwed(actorFromReq(req), order, refundOwed);

  res.json({ message: "Order deleted successfully" });
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const order = await prisma.order.findFirst({
    where: { id: BigInt(id), deleted_at: null },
    include: {
      order_items: true,
      shop: { select: { owner_id: true, name: true } },
    },
  });
  if (!order)
    return res
      .status(404)
      .json({ success: false, message: "Order not found" });
  if (order.user_id.toString() !== userId && req.user.role !== ROLES.ADMIN)
    return res
      .status(403)
      .json({ success: false, message: "Not authorized" });
  // Final states are never cancellable - delivered orders go through the
  // return flow instead (which restocks and refunds properly).
  if (FINAL_ORDER_STATUSES.includes(order.status || ""))
    return res
      .status(400)
      .json({ success: false, message: "Cannot cancel in current status" });
  const cancellableStatuses =
    req.user.role === ROLES.ADMIN
      ? Object.values(ORDER_STATUS).filter(
          (s) => !FINAL_ORDER_STATUSES.includes(s)
        )
      : BUYER_CANCELLABLE_STATUSES;
  if (!cancellableStatuses.includes(order.status || ""))
    return res
      .status(400)
      .json({ success: false, message: "Cannot cancel in current status" });

  const result = await transitionOrderStatus({
    orderId: id,
    status: ORDER_STATUS.CANCELLED,
    allowedFrom: cancellableStatuses,
    actor: actorFromReq(req),
    auditAction: "ORDER_CANCEL",
    // Nguoi mua tu huy thi khong can bao lai cho chinh ho.
    notifyBuyer: order.user_id.toString() !== userId,
  });
  if (!result.ok) {
    return res.status(result.code === "NOT_FOUND" ? 404 : 409).json({
      success: false,
      message:
        result.code === "NOT_FOUND" ? "Order not found" : "Order status already changed",
    });
  }
  const updated = result.order;

  // Let the seller know the buyer cancelled
  if (order.user_id.toString() === userId) {
    notifyUser({
      userId: order.shop?.owner_id,
      title: "Order cancelled",
      message: `Buyer cancelled order ${order.order_number || `#${order.id}`}.`,
      type: "ORDER",
    });
  }

  res.json({ success: true, message: "Order cancelled", order: updated });
});

export const getOrderStats = asyncHandler(async (_req, res) => {
  const whereActive = { deleted_at: null };
  const [total_orders, pending_orders, revenueRows, recent_orders] =
    await Promise.all([
      prisma.order.count({ where: whereActive }),
      prisma.order.count({
        where: { status: ORDER_STATUS.PENDING, deleted_at: null },
      }),
      prisma.order.aggregate({
        _sum: { total_amount: true },
        where: whereActive,
      }),
      prisma.order.findMany({
        orderBy: { created_at: "desc" },
        take: 10,
        where: whereActive,
        include: {
          user: { select: { id: true, name: true } },
          shop: { select: { id: true, name: true } },
        },
      }),
    ]);
  const revenue = Number(revenueRows._sum.total_amount || 0);
  res.json({ total_orders, pending_orders, revenue, recent_orders });
});

// GET /api/orders/shop/stats — seller dashboard stats (own shop only)
export const getShopOrderStats = asyncHandler(async (req, res) => {
  if (!req.shop) {
    return res.status(400).json({ message: "No shop attached to this account" });
  }
  const whereActive = { shop_id: req.shop.id, deleted_at: null };
  const [total_orders, pending_orders, revenueRows, recent_orders] =
    await Promise.all([
      prisma.order.count({ where: whereActive }),
      prisma.order.count({
        where: { ...whereActive, status: ORDER_STATUS.PENDING },
      }),
      prisma.order.aggregate({
        _sum: { total_amount: true },
        where: whereActive,
      }),
      prisma.order.findMany({
        orderBy: { created_at: "desc" },
        take: 10,
        where: whereActive,
        include: { user: { select: { id: true, name: true } } },
      }),
    ]);
  const revenue = Number(revenueRows._sum.total_amount || 0);
  res.json({ total_orders, pending_orders, revenue, recent_orders });
});
