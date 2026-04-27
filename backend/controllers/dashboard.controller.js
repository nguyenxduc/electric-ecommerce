import { prisma } from "../lib/db.js";

// Get dashboard statistics
export const getDashboardStats = async (_req, res) => {
  try {
    const whereActive = { deleted_at: null };
    const whereActiveOrders = { deleted_at: null };
    
    // Calculate date ranges
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const previous7DaysStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const previous7DaysEnd = last7Days;

    // Current period (last 7 days)
    const [
      totalOrdersLast7Days,
      totalOrdersPrevious7Days,
      totalSalesLast7Days,
      totalSalesPrevious7Days,
      pendingOrdersLast7Days,
      pendingOrdersPrevious7Days,
      cancelledOrdersLast7Days,
      cancelledOrdersPrevious7Days,
      totalCustomers,
      totalProducts,
      inStockProducts,
      outOfStockProducts,
      totalRevenue,
    ] = await Promise.all([
      // Orders last 7 days
      prisma.order.count({
        where: {
          ...whereActiveOrders,
          created_at: { gte: last7Days },
        },
      }),
      // Orders previous 7 days
      prisma.order.count({
        where: {
          ...whereActiveOrders,
          created_at: { gte: previous7DaysStart, lt: previous7DaysEnd },
        },
      }),
      // Sales last 7 days
      prisma.order.aggregate({
        _sum: { total_amount: true },
        where: {
          ...whereActiveOrders,
          created_at: { gte: last7Days },
        },
      }),
      // Sales previous 7 days
      prisma.order.aggregate({
        _sum: { total_amount: true },
        where: {
          ...whereActiveOrders,
          created_at: { gte: previous7DaysStart, lt: previous7DaysEnd },
        },
      }),
      // Pending orders last 7 days
      prisma.order.count({
        where: {
          ...whereActiveOrders,
          status: "pending",
          created_at: { gte: last7Days },
        },
      }),
      // Pending orders previous 7 days
      prisma.order.count({
        where: {
          ...whereActiveOrders,
          status: "pending",
          created_at: { gte: previous7DaysStart, lt: previous7DaysEnd },
        },
      }),
      // Cancelled orders last 7 days
      prisma.order.count({
        where: {
          ...whereActiveOrders,
          status: "cancelled",
          created_at: { gte: last7Days },
        },
      }),
      // Cancelled orders previous 7 days
      prisma.order.count({
        where: {
          ...whereActiveOrders,
          status: "cancelled",
          created_at: { gte: previous7DaysStart, lt: previous7DaysEnd },
        },
      }),
      // Total customers
      prisma.user.count({
        where: whereActive,
      }),
      // Total products
      prisma.product.count({
        where: whereActive,
      }),
      // In stock products
      prisma.product.count({
        where: {
          ...whereActive,
          quantity: { gt: 0 },
        },
      }),
      // Out of stock products
      prisma.product.count({
        where: {
          ...whereActive,
          quantity: { lte: 0 },
        },
      }),
      // Total revenue (all time)
      prisma.order.aggregate({
        _sum: { total_amount: true },
        where: whereActiveOrders,
      }),
    ]);

    // Calculate percentages
    const calculateDelta = (current, previous) => {
      if (previous === 0) return current > 0 ? "+100%" : "0%";
      const delta = ((current - previous) / previous) * 100;
      return `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
    };

    const totalSales = Number(totalSalesLast7Days._sum.total_amount || 0);
    const totalSalesPrev = Number(totalSalesPrevious7Days._sum.total_amount || 0);
    const revenue = Number(totalRevenue._sum.total_amount || 0);

    res.json({
      success: true,
      data: {
        sales: {
          current: totalSales,
          previous: totalSalesPrev,
          delta: calculateDelta(totalSales, totalSalesPrev),
          formatted: formatCurrency(totalSales),
          formattedPrev: formatCurrency(totalSalesPrev),
        },
        orders: {
          current: totalOrdersLast7Days,
          previous: totalOrdersPrevious7Days,
          delta: calculateDelta(totalOrdersLast7Days, totalOrdersPrevious7Days),
          formatted: formatNumber(totalOrdersLast7Days),
          formattedPrev: formatNumber(totalOrdersPrevious7Days),
        },
        pending: {
          current: pendingOrdersLast7Days,
          previous: pendingOrdersPrevious7Days,
          delta: calculateDelta(pendingOrdersLast7Days, pendingOrdersPrevious7Days),
          formatted: formatNumber(pendingOrdersLast7Days),
        },
        cancelled: {
          current: cancelledOrdersLast7Days,
          previous: cancelledOrdersPrevious7Days,
          delta: calculateDelta(cancelledOrdersLast7Days, cancelledOrdersPrevious7Days),
          formatted: formatNumber(cancelledOrdersLast7Days),
        },
        customers: {
          total: totalCustomers,
          formatted: formatNumber(totalCustomers),
        },
        products: {
          total: totalProducts,
          inStock: inStockProducts,
          outOfStock: outOfStockProducts,
          formatted: {
            total: formatNumber(totalProducts),
            inStock: formatNumber(inStockProducts),
            outOfStock: formatNumber(outOfStockProducts),
          },
        },
        revenue: {
          total: revenue,
          formatted: formatCurrency(revenue),
        },
      },
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get dashboard stats",
      details: error.message,
    });
  }
};

// Get top products
export const getTopProducts = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 4;
    const whereActive = { deleted_at: null };

    const topProducts = await prisma.product.findMany({
      where: {
        ...whereActive,
        sold: { gt: 0 },
      },
      orderBy: {
        sold: "desc",
      },
      take: limit,
      select: {
        id: true,
        name: true,
        price: true,
        discount: true,
        sold: true,
        img: true,
      },
    });

    const formattedProducts = topProducts.map((product) => {
      const price = Number(product.price);
      const discount = Number(product.discount);
      const finalPrice = price - discount;
      return {
        id: product.id.toString(),
        name: product.name,
        sku: `PRD-${product.id.toString().padStart(6, "0")}`,
        price: formatCurrency(finalPrice),
        priceValue: finalPrice,
        sold: product.sold,
        image: product.img && product.img.length > 0 ? product.img[0] : null,
      };
    });

    res.json({
      success: true,
      data: formattedProducts,
    });
  } catch (error) {
    console.error("Get top products error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get top products",
      details: error.message,
    });
  }
};

// Helper functions
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatNumber(num) {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}

