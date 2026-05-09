import { prisma } from "../lib/db.js";
import { earnPointsForOrder } from "./loyalty.controller.js";
import { writeAuditLog } from "./audit.controller.js";

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

export const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { items, shipping_address, payment_method, coupon_code } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No order items provided" });
    }

    let totalAmount = 0;
    const orderItemsData = [];
    const orderItemColors = [];
    for (const it of items) {
      const product = await prisma.product.findFirst({
        where: { id: BigInt(it.product_id), deleted_at: null },
        include: { product_colors: true },
      });
      if (!product)
        return res
          .status(400)
          .json({ message: `Product ${it.product_id} not found` });

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

      const unitPrice = product.price;
      const totalPrice = Number(unitPrice) * Number(it.quantity);
      totalAmount += totalPrice;
      orderItemsData.push({
        product_id: BigInt(it.product_id),
        quantity: it.quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        color: colorVal ? JSON.stringify(colorVal) : null,
      });
      orderItemColors.push(colorVal);
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

    // apply coupon if provided (optional)
    let couponId = null;
    let couponDiscount = 0;
    let appliedCoupon = null;
    if (coupon_code) {
      const coupon = await prisma.coupon.findFirst({
        where: { code: coupon_code, deleted_at: null },
        include: {
          users: {
            select: { id: true },
          },
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
      if (
        coupon.min_order &&
        Number(amountAfterTierDiscount) < Number(coupon.min_order)
      ) {
        return res
          .status(400)
          .json({ message: "Order does not meet minimum amount" });
      }
      // Personal voucher: must belong to current user
      if (
        Array.isArray(coupon.users) &&
        coupon.users.length > 0 &&
        !coupon.users.some((u) => u.id.toString() === String(userId))
      ) {
        return res.status(403).json({ message: "Voucher does not belong to this user" });
      }

      // Compute discount
      if (coupon.discount_type === "percent") {
        couponDiscount =
          (Number(amountAfterTierDiscount) * Number(coupon.discount_value)) / 100;
      } else {
        couponDiscount = Number(coupon.discount_value);
      }

      couponId = coupon.id;
      appliedCoupon = coupon;
    }

    const finalAmount = Math.max(
      0,
      Number(amountAfterTierDiscount) - couponDiscount
    );

    // Parse shipping_address if it's a string
    let parsedShippingAddress = shipping_address;
    if (typeof shipping_address === "string") {
      try {
        parsedShippingAddress = JSON.parse(shipping_address);
      } catch {
        parsedShippingAddress = shipping_address;
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          user_id: BigInt(userId),
          order_number: `ORD-${Date.now()}`,
          total_amount: finalAmount,
          status: "pending",
          shipping_address: parsedShippingAddress ?? null,
          receiver_name: parsedShippingAddress?.name || null,
          receiver_phone: parsedShippingAddress?.phone || null,
          payment_method: payment_method ?? null,
          coupon_id: couponId,
          order_items: { createMany: { data: orderItemsData } },
        },
        include: { order_items: true },
      });

      // decrement stock and increment sold
      for (let i = 0; i < orderItemsData.length; i++) {
        const it = orderItemsData[i];
        const colorObj = orderItemColors[i];
        // decrement product color if applicable
        if (colorObj && (colorObj.code || colorObj.name)) {
          await tx.productColor.updateMany({
            where: {
              product_id: it.product_id,
              OR: [
                colorObj.code ? { code: colorObj.code } : undefined,
                colorObj.name ? { name: colorObj.name } : undefined,
              ].filter(Boolean),
            },
            data: { quantity: { decrement: it.quantity } },
          });
        }
        await tx.product.update({
          where: { id: it.product_id },
          data: {
            quantity: { decrement: it.quantity },
            sold: { increment: it.quantity },
          },
        });
      }

      // Cộng điểm khi tạo đơn (có thể chuyển sang lúc delivered nếu cần)
      await earnPointsForOrder(
        tx,
        BigInt(userId),
        createdOrder.id,
        createdOrder.total_amount
      );

      // Mark coupon usage after order is created successfully.
      if (appliedCoupon?.id) {
        await tx.coupon.update({
          where: { id: appliedCoupon.id },
          data: { used_count: { increment: 1 } },
        });
      }

      return createdOrder;
    });

    // Audit log tạo đơn + có thể dùng cho phân loại khách hàng
    writeAuditLog({
      userId,
      action: "ORDER_CREATE",
      resource: "order",
      resourceId: created.id,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: {
        totalAmount,
        userTier,
        tierDiscountRate,
        tierDiscount,
        couponDiscount,
        finalAmount,
      },
    });

    res.status(201).json({
      message: "Order created successfully",
      order: created,
      subtotal: Number(totalAmount),
      amountAfterTierDiscount,
      tierDiscount,
      tierDiscountRate,
      discount: couponDiscount,
      finalAmount,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to create order", error: error.message });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    //const userId = req.user.id;

    const order = await prisma.order.findFirst({
      where: { id: BigInt(id), deleted_at: null },
      include: {
        user: { select: { id: true, name: true, email: true } },
        order_items: {
          include: { product: { select: { id: true, name: true, img: true } } },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
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
    const { page = 1, limit = 20, status, q } = req.query;

    const where = { deleted_at: null };
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
          order_items: true,
          user: { select: { id: true, name: true, email: true } },
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

    // Admin route: allow cancel in any status, but avoid double-cancel
    if (status === "cancelled" && order.status === "cancelled") {
      return res.status(400).json({ message: "Order already cancelled" });
    }

    const restockItems = async (tx, items) => {
      for (const item of items) {
        // parse color if stored as JSON string
        let colorObj = null;
        if (typeof item.color === "string") {
          try {
            colorObj = JSON.parse(item.color);
          } catch {
            colorObj = null;
          }
        }

        if (colorObj && (colorObj.code || colorObj.name)) {
          await tx.productColor.updateMany({
            where: {
              product_id: item.product_id,
              OR: [
                colorObj.code ? { code: colorObj.code } : undefined,
                colorObj.name ? { name: colorObj.name } : undefined,
              ].filter(Boolean),
            },
            data: {
              quantity: { increment: item.quantity },
            },
          });
        }

        await tx.product.update({
          where: { id: item.product_id },
          data: {
            quantity: { increment: item.quantity },
            sold: { decrement: item.quantity },
          },
        });
      }
    };

    if (status === "cancelled" && order.status !== "cancelled") {
      await restockItems(prisma, order.order_items);
    }

    const updatedOrder = await prisma.order.update({
      where: { id: BigInt(id) },
      data: { status },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    writeAuditLog({
      userId: req.user.id,
      action: "ORDER_STATUS_UPDATE",
      resource: "order",
      resourceId: id,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { status },
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

    for (const item of order.order_items) {
      await prisma.product.update({
        where: { id: item.product_id },
        data: {
          quantity: { increment: item.quantity },
          sold: { decrement: item.quantity },
        },
      });
    }

    await prisma.order.update({
      where: { id: BigInt(id) },
      data: { deleted_at: new Date() },
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
      include: { order_items: true },
    });
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    if (order.user_id.toString() !== userId && req.user.role !== "admin")
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    if (
      req.user.role !== "admin" &&
      !["pending", "processing"].includes(order.status || "")
    )
      return res
        .status(400)
        .json({ success: false, message: "Cannot cancel in current status" });
    if (order.status === "cancelled")
      return res
        .status(400)
        .json({ success: false, message: "Order already cancelled" });

    const restockItems = async (tx, items) => {
      for (const item of items) {
        let colorObj = null;
        if (typeof item.color === "string") {
          try {
            colorObj = JSON.parse(item.color);
          } catch {
            colorObj = null;
          }
        }

        if (colorObj && (colorObj.code || colorObj.name)) {
          await tx.productColor.updateMany({
            where: {
              product_id: item.product_id,
              OR: [
                colorObj.code ? { code: colorObj.code } : undefined,
                colorObj.name ? { name: colorObj.name } : undefined,
              ].filter(Boolean),
            },
            data: { quantity: { increment: item.quantity } },
          });
        }

        await tx.product.update({
          where: { id: item.product_id },
          data: {
            quantity: { increment: item.quantity },
            sold: { decrement: item.quantity },
          },
        });
      }
    };

    await restockItems(prisma, order.order_items);

    const updated = await prisma.order.update({
      where: { id: BigInt(id) },
      data: { status: "cancelled" },
    });
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
          include: { user: { select: { id: true, name: true } } },
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
