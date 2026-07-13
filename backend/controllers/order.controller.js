import { prisma } from "../lib/db.js";
import {
  earnPointsForOrder,
  revertPointsForOrder,
} from "./loyalty.controller.js";
import { writeAuditLog } from "./audit.controller.js";
import { notifyUser } from "../lib/notify.js";
import { ROLES } from "../constants/roles.js";
import { SHOP_STATUS } from "./shop.controller.js";
import { getSettingNumber } from "../lib/settings.js";
import { restockOrderItems } from "../lib/restock.js";

// Legal order-status transitions. delivered/cancelled/returned are final
// ("returned" is only reachable through the return-request flow).
const STATUS_FLOW = {
  pending: ["processing", "shipped", "delivered", "cancelled"],
  processing: ["shipped", "delivered", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
  returned: [],
};

const TIER_AUTO_DISCOUNT_RATE = {
  BRONZE: 0,
  SILVER: 0.02,
  GOLD: 0.05,
  PLATINUM: 0.08,
};

const getTierFromPoints = (points = 0) => {
  if (points >= 5000) return "PLATINUM";
  if (points >= 2000) return "GOLD";
  if (points >= 500) return "SILVER";
  return "BRONZE";
};

const round2 = (n) => Math.round(Number(n) * 100) / 100;

// Housekeeping after a suborder is cancelled/deleted:
// 1. Void the checkout's un-paid payments - their amount no longer matches,
//    so the buyer must re-initiate payment (recomputed from active orders).
// 2. When EVERY suborder of the checkout is gone, give the voucher use back.
const onSuborderCancelled = async (tx, order) => {
  await tx.payment.updateMany({
    where: { order_group_id: order.order_group_id, status: "pending" },
    data: {
      status: "canceled",
      message: "Voided: an order in this checkout was cancelled",
    },
  });

  const activeCount = await tx.order.count({
    where: {
      order_group_id: order.order_group_id,
      status: { not: "cancelled" },
      deleted_at: null,
    },
  });
  if (activeCount === 0) {
    const group = await tx.orderGroup.findUnique({
      where: { id: order.order_group_id },
      select: { coupon_id: true },
    });
    if (group?.coupon_id) {
      await tx.coupon.updateMany({
        where: { id: group.coupon_id, used_count: { gt: 0 } },
        data: { used_count: { decrement: 1 } },
      });
    }
  }
};

export const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { items, shipping_address, payment_method, coupon_code } = req.body;

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
      } else if (product.product_colors.length > 0) {
        return res.status(400).json({
          message: `Color required for product ${product.name}`,
        });
      } else {
        if (product.quantity < it.quantity) {
          return res.status(400).json({
            message: `Insufficient stock for ${product.name}`,
          });
        }
      }

      // Charge the discounted price - matches what the cart displays
      const unitPrice = round2(
        Number(product.price) - Number(product.discount || 0)
      );
      const totalPrice = Number(unitPrice) * Number(it.quantity);
      totalAmount += totalPrice;
      preparedItems.push({
        data: {
          product_id: BigInt(it.product_id),
          quantity: it.quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          color: colorVal ? JSON.stringify(colorVal) : null,
        },
        color: colorVal,
        productName: product.name,
        shop: product.shop,
      });
    }

    // Group cart items by shop - each shop gets its own Order
    const shopGroups = new Map();
    for (const item of preparedItems) {
      const key = item.shop.id.toString();
      if (!shopGroups.has(key)) {
        shopGroups.set(key, {
          shopId: item.shop.id,
          shopName: item.shop.name,
          shopOwnerId: item.shop.owner_id,
          shippingFeeOverride: item.shop.shipping_fee_override,
          freeShippingThresholdOverride:
            item.shop.free_shipping_threshold_override,
          items: [],
          subtotal: 0,
        });
      }
      const group = shopGroups.get(key);
      group.items.push(item);
      group.subtotal += Number(item.data.total_price);
    }

    // Per-shop shipping: the shop's own fee/threshold, else platform defaults.
    const [platformShippingFee, platformFreeThreshold] = await Promise.all([
      getSettingNumber("shipping_fee", 9.99),
      getSettingNumber("free_shipping_threshold", 199),
    ]);
    let shippingTotal = 0;
    for (const group of shopGroups.values()) {
      const fee =
        group.shippingFeeOverride != null
          ? Number(group.shippingFeeOverride)
          : platformShippingFee;
      const threshold =
        group.freeShippingThresholdOverride != null
          ? Number(group.freeShippingThresholdOverride)
          : platformFreeThreshold;
      group.shipping = group.subtotal >= threshold ? 0 : round2(fee);
      shippingTotal += group.shipping;
    }

    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: { segment: true, loyalty_points: true },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userTier = user.segment || getTierFromPoints(user.loyalty_points || 0);
    const tierDiscountRate = TIER_AUTO_DISCOUNT_RATE[userTier] || 0;
    const tierDiscount = Number(totalAmount) * tierDiscountRate;
    const amountAfterTierDiscount = Math.max(0, Number(totalAmount) - tierDiscount);

    // apply coupon if provided (optional). Shop vouchers (coupon.shop_id set)
    // only discount that shop's items; platform vouchers discount the whole cart.
    let couponId = null;
    let couponDiscount = 0;
    let appliedCoupon = null;
    let couponShopKey = null; // shopGroups key the voucher applies to
    if (coupon_code) {
      const coupon = await prisma.coupon.findFirst({
        where: { code: coupon_code, deleted_at: null },
        include: {
          users: {
            select: { id: true },
          },
          shop: { select: { id: true, name: true } },
        },
      });

      // Validate coupon
      if (!coupon) {
        return res.status(400).json({ message: "Invalid coupon code" });
      }
      const now = new Date();
      if (coupon.expires_at && now > coupon.expires_at) {
        return res.status(400).json({ message: "Coupon has expired" });
      }
      if (
        coupon.usage_limit !== null &&
        coupon.used_count !== null &&
        coupon.used_count >= coupon.usage_limit
      ) {
        return res.status(400).json({ message: "Coupon usage limit reached" });
      }
      // Personal voucher: must belong to current user
      if (
        Array.isArray(coupon.users) &&
        coupon.users.length > 0 &&
        !coupon.users.some((u) => u.id.toString() === String(userId))
      ) {
        return res.status(403).json({ message: "Voucher does not belong to this user" });
      }

      if (coupon.shop_id) {
        // Shop voucher: cart must contain items from that shop
        couponShopKey = coupon.shop_id.toString();
        const targetGroup = shopGroups.get(couponShopKey);
        if (!targetGroup) {
          return res.status(400).json({
            message: `Voucher only applies to items from ${
              coupon.shop?.name || "its shop"
            }`,
          });
        }
        const groupAfterTier = round2(
          targetGroup.subtotal * (1 - tierDiscountRate)
        );
        if (coupon.min_order && groupAfterTier < Number(coupon.min_order)) {
          return res.status(400).json({
            message: `${coupon.shop?.name || "Shop"} items do not meet the voucher minimum`,
          });
        }
        couponDiscount =
          coupon.discount_type === "percent"
            ? (groupAfterTier * Number(coupon.discount_value)) / 100
            : Number(coupon.discount_value);
        couponDiscount = Math.min(couponDiscount, groupAfterTier);
      } else {
        // Platform voucher: discounts the whole cart
        if (
          coupon.min_order &&
          Number(amountAfterTierDiscount) < Number(coupon.min_order)
        ) {
          return res
            .status(400)
            .json({ message: "Order does not meet minimum amount" });
        }
        couponDiscount =
          coupon.discount_type === "percent"
            ? (Number(amountAfterTierDiscount) * Number(coupon.discount_value)) /
              100
            : Number(coupon.discount_value);
        couponDiscount = Math.min(couponDiscount, amountAfterTierDiscount);
      }

      couponId = coupon.id;
      appliedCoupon = coupon;
    }

    // Merchandise total after discounts; shipping is added on top.
    const merchandiseTotal = Math.max(
      0,
      Number(amountAfterTierDiscount) - couponDiscount
    );
    const finalAmount = round2(merchandiseTotal + shippingTotal);

    // Parse shipping_address if it's a string
    let parsedShippingAddress = shipping_address;
    if (typeof shipping_address === "string") {
      try {
        parsedShippingAddress = JSON.parse(shipping_address);
      } catch {
        parsedShippingAddress = shipping_address;
      }
    }

    // Allocate the merchandise total across shop-orders (each order then adds
    // its own shipping fee). Tier discount is prorated by subtotal share; a
    // shop voucher lands entirely on its shop; a platform voucher is prorated.
    // The last group absorbs rounding remainders so suborder totals sum to
    // finalAmount exactly (required for payment reconciliation).
    const groups = [...shopGroups.values()];
    let allocatedMerch = 0;
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      if (i === groups.length - 1) {
        group.merchTotal = round2(merchandiseTotal - allocatedMerch);
      } else {
        const share = totalAmount > 0 ? group.subtotal / totalAmount : 0;
        const tierShare = tierDiscount * share;
        const couponShare = couponShopKey
          ? group.shopId.toString() === couponShopKey
            ? couponDiscount
            : 0
          : couponDiscount * share;
        group.merchTotal = round2(
          Math.max(0, group.subtotal - tierShare - couponShare)
        );
        allocatedMerch += group.merchTotal;
      }
      group.finalTotal = round2(group.merchTotal + group.shipping);
    }

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
            status: "pending",
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

      // Mark coupon usage once per checkout, not per suborder.
      if (appliedCoupon?.id) {
        await tx.coupon.update({
          where: { id: appliedCoupon.id },
          data: { used_count: { increment: 1 } },
        });
      }

      return { orderGroup, orders: createdOrders };
    });

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
    res
      .status(500)
      .json({ message: "Failed to create order", error: error.message });
  }
};

export const getOrderById = async (req, res) => {
  try {
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
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get order", error: error.message });
  }
};

export const getUserOrders = async (req, res) => {
  try {
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
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get user orders", error: error.message });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, q, shop_id } = req.query;

    const where = { deleted_at: null };
    if (status) where.status = String(status);
    if (shop_id) where.shop_id = BigInt(shop_id);
    if (q) where.order_number = { contains: String(q), mode: "insensitive" };

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

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
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get all orders", error: error.message });
  }
};

// GET /api/orders/shop/mine — seller dashboard: own shop's orders only
export const getShopOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, q } = req.query;

    if (!req.shop) {
      return res.status(400).json({
        message: "No shop attached to this account; use admin list instead",
      });
    }

    const where = { shop_id: req.shop.id, deleted_at: null };
    if (status) where.status = String(status);
    if (q) where.order_number = { contains: String(q), mode: "insensitive" };

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

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
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get shop orders", error: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await prisma.order.findFirst({
      where: { id: BigInt(id), deleted_at: null },
      include: { order_items: true },
    });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Enforce a legal transition (finals: delivered/cancelled/returned)
    const currentStatus = order.status || "pending";
    if (!(STATUS_FLOW[currentStatus] || []).includes(status)) {
      return res.status(400).json({
        message: `Cannot change order status from "${currentStatus}" to "${status}"`,
      });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      if (status === "cancelled") {
        // Cancelling puts the items back in stock and claws back earned points
        await restockOrderItems(tx, order.order_items);
        await revertPointsForOrder(tx, order.user_id, order.id);
      }
      const updated = await tx.order.update({
        where: { id: BigInt(id) },
        data: { status },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      if (status === "cancelled") {
        await onSuborderCancelled(tx, order);
      }
      return updated;
    });

    writeAuditLog({
      userId: req.user.id,
      action: "ORDER_STATUS_UPDATE",
      resource: "order",
      resourceId: id,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { status, previous: currentStatus },
    });

    // Keep the buyer in the loop about their order's progress
    const STATUS_LABEL = {
      processing: "is being prepared 📦",
      shipped: "is on the way 🚚",
      delivered: "has been delivered ✅",
      cancelled: "was cancelled ❌",
    };
    notifyUser({
      userId: order.user_id,
      title: "Order update",
      message: `Order ${order.order_number || `#${order.id}`} ${
        STATUS_LABEL[status] || `status changed to ${status}`
      }`,
      type: "ORDER",
    });

    res.json({
      message: "Order status updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update order status", error: error.message });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: { id: BigInt(id), deleted_at: null },
      include: { order_items: true },
    });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Cannot delete order in current status" });
    }

    await prisma.$transaction(async (tx) => {
      await restockOrderItems(tx, order.order_items);
      await revertPointsForOrder(tx, order.user_id, order.id);
      const deleted = await tx.order.update({
        where: { id: BigInt(id) },
        data: { deleted_at: new Date() },
      });
      await onSuborderCancelled(tx, deleted);
    });

    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete order", error: error.message });
  }
};

export const cancelOrder = async (req, res) => {
  try {
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
    if (["delivered", "cancelled", "returned"].includes(order.status || ""))
      return res
        .status(400)
        .json({ success: false, message: "Cannot cancel in current status" });
    if (
      req.user.role !== ROLES.ADMIN &&
      !["pending", "processing"].includes(order.status || "")
    )
      return res
        .status(400)
        .json({ success: false, message: "Cannot cancel in current status" });

    const updated = await prisma.$transaction(async (tx) => {
      await restockOrderItems(tx, order.order_items);
      await revertPointsForOrder(tx, order.user_id, order.id);
      const cancelled = await tx.order.update({
        where: { id: BigInt(id) },
        data: { status: "cancelled" },
      });
      await onSuborderCancelled(tx, cancelled);
      return cancelled;
    });

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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to cancel order",
      error: error.message,
    });
  }
};

export const getOrderStats = async (_req, res) => {
  try {
    const whereActive = { deleted_at: null };
    const [total_orders, pending_orders, revenueRows, recent_orders] =
      await Promise.all([
        prisma.order.count({ where: whereActive }),
        prisma.order.count({ where: { status: "pending", deleted_at: null } }),
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
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get stats", error: error.message });
  }
};

// GET /api/orders/shop/stats — seller dashboard stats (own shop only)
export const getShopOrderStats = async (req, res) => {
  try {
    if (!req.shop) {
      return res.status(400).json({ message: "No shop attached to this account" });
    }
    const whereActive = { shop_id: req.shop.id, deleted_at: null };
    const [total_orders, pending_orders, revenueRows, recent_orders] =
      await Promise.all([
        prisma.order.count({ where: whereActive }),
        prisma.order.count({ where: { ...whereActive, status: "pending" } }),
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
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get shop stats", error: error.message });
  }
};
