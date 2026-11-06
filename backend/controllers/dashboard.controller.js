import { prisma } from "../lib/db.js";
import { ORDER_STATUS } from "../constants/status.js";
import { getSettingNumber } from "../lib/settings.js";
import { asyncHandler } from "../middleware/error.middleware.js";

// Get dashboard statistics.
// shopId (optional) scopes orders/products to one shop (seller dashboard).
const buildDashboardStats = async (res, shopId = null) => {
  try {
    const shopScope = shopId ? { shop_id: shopId } : {};
    const whereActive = { deleted_at: null };
    const whereActiveOrders = { deleted_at: null, ...shopScope };
    // Doanh thu chi tinh tren don thuc su ban duoc. Truoc day cac phep cong
    // tien dung chung whereActiveOrders (khong loc trang thai), nen don da huy
    // va don da tra hang van duoc tinh la doanh thu - keo theo ca phi san 5%
    // cua seller bi tinh tren tien khong he thu duoc.
    const whereRevenueOrders = {
      ...whereActiveOrders,
      status: {
        notIn: [ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED],
      },
    };
    const whereActiveProducts = { deleted_at: null, ...shopScope };
    // Seller dashboard: "customers" means buyers who've ordered from this
    // shop, not every registered user on the platform.
    const whereCustomers = shopId
      ? { ...whereActive, orders: { some: { shop_id: shopId, deleted_at: null } } }
      : whereActive;

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
          ...whereRevenueOrders,
          created_at: { gte: last7Days },
        },
      }),
      // Sales previous 7 days
      prisma.order.aggregate({
        _sum: { total_amount: true },
        where: {
          ...whereRevenueOrders,
          created_at: { gte: previous7DaysStart, lt: previous7DaysEnd },
        },
      }),
      // Pending orders last 7 days
      prisma.order.count({
        where: {
          ...whereActiveOrders,
          status: ORDER_STATUS.PENDING,
          created_at: { gte: last7Days },
        },
      }),
      // Pending orders previous 7 days
      prisma.order.count({
        where: {
          ...whereActiveOrders,
          status: ORDER_STATUS.PENDING,
          created_at: { gte: previous7DaysStart, lt: previous7DaysEnd },
        },
      }),
      // Cancelled orders last 7 days
      prisma.order.count({
        where: {
          ...whereActiveOrders,
          status: ORDER_STATUS.CANCELLED,
          created_at: { gte: last7Days },
        },
      }),
      // Cancelled orders previous 7 days
      prisma.order.count({
        where: {
          ...whereActiveOrders,
          status: ORDER_STATUS.CANCELLED,
          created_at: { gte: previous7DaysStart, lt: previous7DaysEnd },
        },
      }),
      // Total customers
      prisma.user.count({
        where: whereCustomers,
      }),
      // Total products
      prisma.product.count({
        where: whereActiveProducts,
      }),
      // In stock products
      prisma.product.count({
        where: {
          ...whereActiveProducts,
          quantity: { gt: 0 },
        },
      }),
      // Out of stock products
      prisma.product.count({
        where: {
          ...whereActiveProducts,
          quantity: { lte: 0 },
        },
      }),
      // Total revenue (all time)
      prisma.order.aggregate({
        _sum: { total_amount: true },
        where: whereRevenueOrders,
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

    // Seller view: show the platform commission cut and net payout amount.
    let commission = null;
    if (shopId) {
      const rate = await getSettingNumber("platform_commission_rate", 0.05);
      const fee = Math.round(revenue * rate * 100) / 100;
      commission = {
        rate,
        ratePercent: `${(rate * 100).toFixed(0)}%`,
        fee,
        netRevenue: Math.round((revenue - fee) * 100) / 100,
        formatted: {
          fee: formatCurrency(fee),
          netRevenue: formatCurrency(revenue - fee),
        },
      };
    }

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
        ...(commission && { commission }),
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

// Platform-wide stats (admin)
export const getDashboardStats = (_req, res) => buildDashboardStats(res);

// Own-shop stats (seller dashboard)
export const getShopDashboardStats = (req, res) => {
  if (!req.shop) {
    return res
      .status(400)
      .json({ success: false, error: "No shop attached to this account" });
  }
  return buildDashboardStats(res, req.shop.id);
};

// Get top products.
// shopId (optional) scopes to one shop (seller dashboard).
const buildTopProducts = async (req, res, shopId = null) => {
  try {
    const limit = Number(req.query.limit) || 4;
    const whereActive = { deleted_at: null, ...(shopId && { shop_id: shopId }) };

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

// Platform-wide top products (admin)
export const getTopProducts = (req, res) => buildTopProducts(req, res);

// Own-shop top products (seller dashboard)
export const getShopTopProducts = (req, res) => {
  if (!req.shop) {
    return res
      .status(400)
      .json({ success: false, error: "No shop attached to this account" });
  }
  return buildTopProducts(req, res, req.shop.id);
};

// Retention + phieu chuyen doi (admin). GET /api/dashboard/behavior?days=30
//
// Cua so bao cao: [since, rollupUntil] = [N ngay truoc 00:00 UTC, het ngay hom
// qua]. Bang user_behavior_daily chi co du lieu den HET NGAY HOM QUA (xem
// jobs/rollupUserBehaviorDaily.js - no chi rollup "hom qua"), nen bang `orders`
// cung bi cat ve dung moc do. Neu de orders doc den "now" trong khi rollup chi
// den hom qua thi moi ty le deu bi lech am tham: tu so co don hom nay, mau so
// khong co visitor hom nay.
export const getBehaviorAnalytics = asyncHandler(async (req, res) => {
  const rawDays = Number(req.query.days);
  // days=0 phai duoc giu nguyen (cua so rong) chu khong roi ve mac dinh 30.
  // Chan tren 730 ngay: so qua lon lam Date thanh Invalid Date va toISOString()
  // nem loi -> 500.
  const days =
    Number.isFinite(rawDays) && rawDays >= 0 ? Math.min(Math.floor(rawDays), 730) : 30;

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  since.setUTCHours(0, 0, 0, 0);

  const rollupUntil = new Date();
  rollupUntil.setUTCDate(rollupUntil.getUTCDate() - 1);
  rollupUntil.setUTCHours(23, 59, 59, 999);

  // Cot `day` la DATE: so sanh bang chuoi 'YYYY-MM-DD'::date de khong phu thuoc
  // vao TimeZone cua session Postgres.
  const sinceDay = since.toISOString().slice(0, 10);
  const untilDay = rollupUntil.toISOString().slice(0, 10);

  // Cung bo loc "don thuc su ban duoc" nhu buildDashboardStats: don da huy va
  // don da tra hang khong phai nguoi mua.
  const whereRevenueOrders = {
    deleted_at: null,
    status: { notIn: [ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED] },
    created_at: { gte: since, lte: rollupUntil },
  };

  const [retentionRows, funnelRows, buyerGroups] = await Promise.all([
    prisma.$queryRaw`
      WITH v AS (
        SELECT visitor_key, COUNT(DISTINCT day) AS active_days
        FROM user_behavior_daily
        WHERE day BETWEEN ${sinceDay}::date AND ${untilDay}::date
          AND visitor_key <> 'sess:unknown'
        GROUP BY visitor_key
      )
      SELECT
        CAST(COUNT(*) AS int) AS visitors,
        CAST(COUNT(*) FILTER (WHERE active_days >= 2) AS int) AS returning_visitors
      FROM v;
    `,
    prisma.$queryRaw`
      WITH viewers AS (
        SELECT DISTINCT visitor_key
        FROM user_behavior_daily
        WHERE day BETWEEN ${sinceDay}::date AND ${untilDay}::date
          AND event_type = 'view'
          AND visitor_key <> 'sess:unknown'
      ),
      carters AS (
        SELECT DISTINCT visitor_key
        FROM user_behavior_daily
        WHERE day BETWEEN ${sinceDay}::date AND ${untilDay}::date
          AND event_type = 'add_to_cart'
          AND visitor_key <> 'sess:unknown'
      )
      SELECT
        CAST((SELECT COUNT(*) FROM viewers) AS int) AS viewers,
        CAST((
          SELECT COUNT(*) FROM carters c
          WHERE EXISTS (SELECT 1 FROM viewers v WHERE v.visitor_key = c.visitor_key)
        ) AS int) AS carters,
        CAST((
          SELECT COUNT(*) FROM carters c
          WHERE c.visitor_key LIKE 'user:%'
            AND EXISTS (SELECT 1 FROM viewers v WHERE v.visitor_key = c.visitor_key)
        ) AS int) AS logged_in_carters,
        -- Tu so cua cartToOrderRate: chi nguoi mua NAM TRONG tap carter tren.
        -- Dem tat ca nguoi mua (mua ngay, gio hang tu truoc cua so) se cho ty le > 100%.
        CAST((
          SELECT COUNT(DISTINCT o.user_id) FROM orders o
          WHERE o.deleted_at IS NULL
            AND COALESCE(o.status, '') NOT IN ('cancelled', 'returned')
            AND o.created_at BETWEEN ${since} AND ${rollupUntil}
            AND EXISTS (
              SELECT 1 FROM carters c JOIN viewers v ON v.visitor_key = c.visitor_key
              WHERE c.visitor_key = 'user:' || o.user_id::text
            )
        ) AS int) AS cart_buyers;
    `,
    // groupBy theo user_id = so NGUOI mua, khong phai so dong order: mot lan
    // thanh toan bi tach thanh N don theo shop nen dem dong se thoi len N lan.
    prisma.order.groupBy({
      by: ["user_id"],
      where: whereRevenueOrders,
    }),
  ]);

  const visitors = Number(retentionRows[0]?.visitors || 0);
  const returning = Number(retentionRows[0]?.returning_visitors || 0);
  const viewers = Number(funnelRows[0]?.viewers || 0);
  const carters = Number(funnelRows[0]?.carters || 0);
  const loggedInCarters = Number(funnelRows[0]?.logged_in_carters || 0);
  const cartBuyers = Number(funnelRows[0]?.cart_buyers || 0);
  const buyers = buyerGroups.length;

  // Mau so bang 0 thi tra ve 0, khong bao gio chia (khong NaN, khong Infinity).
  const rate = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

  res.json({
    success: true,
    data: {
      window: {
        days,
        since: since.toISOString(),
        until: rollupUntil.toISOString(),
      },
      visitors,
      returning,
      returningRate: rate(returning, visitors),
      funnel: {
        viewers,
        carters,
        loggedInCarters,
        buyers,
        viewToCartRate: rate(carters, viewers),
        cartBuyers,
        cartToOrderRate: rate(cartBuyers, loggedInCarters),
      },
      caveats: {
        timezone: "UTC",
        rollupLag:
          "user_behavior_daily chi co du lieu den het ngay hom qua; ca so lieu rollup va don hang trong bao cao nay deu bi cat ve cung moc do",
        anonymousExcluded:
          "buoc gio hang->don hang chi tinh tren khach da dang nhap (visitor_key dang 'user:*'); khach chua dang nhap ('sess:*') khong join duoc voi don hang",
        identityNote:
          "mot nguoi duyet web roi dang nhap se co hai visitor_key khac nhau (sess:* va user:*), co the lam visitors cao hon thuc te va returningRate thap hon thuc te",
      },
    },
  });
});

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

