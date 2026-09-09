// Bộ công cụ để mô hình tự truy vấn cơ sở dữ liệu (function calling / tool use).
//
// Vì sao cần: trước đây kết quả truy hồi được nhồi vào prompt dưới dạng văn
// bản tĩnh, nên giá trong câu trả lời là ảnh chụp tại thời điểm sinh embedding,
// còn tồn kho thì hoàn toàn không có trong ngữ cảnh. Với dữ liệu thương mại
// điện tử - giá đổi theo khuyến mãi, tồn kho đổi theo từng đơn - đó là kiến
// trúc sai. Ở đây tách vai trò rạch ròi:
//
//   truy hồi lai  -> chỉ để TÌM ứng viên phù hợp với câu hỏi
//   công cụ này   -> lấy SỐ LIỆU tại đúng thời điểm trả lời
//
// Mọi truy vấn đều lọc shop đang hoạt động. Gian hàng bị đình chỉ phải biến
// mất khỏi câu trả lời của trợ lý ảo giống như biến mất khỏi trang bán hàng.

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { retrieveHybrid } from "./retrieval.js";
import { slugifyText } from "../lib/vietnamese.js";
import { calculateProductPrices } from "../lib/productQuery.js";

const PRODUCT_BASE_URL =
  process.env.FRONTEND_BASE_URL || "http://localhost:5173";

const slugify = (str) => slugifyText(str);

const productLink = (row) =>
  `${PRODUCT_BASE_URL}/product/${slugify(`${row.name}-p${row.id}`)}`;

// Giá và tồn kho trợ lý ảo nói ra phải khớp tuyệt đối với trang sản phẩm,
// nếu không thì chỉ số "độ chính xác giá / tồn kho" chẳng còn ý nghĩa gì. Vì
// vậy dùng lại đúng hàm mà API sản phẩm đang dùng, thay vì chép lại quy tắc
// tính giá ở đây rồi để hai chỗ trôi khỏi nhau. Lưu ý cột discount là SỐ TIỀN
// giảm tuyệt đối, không phải phần trăm.
const priceOf = (row) => calculateProductPrices(row);

const stockLabel = (qty) => {
  const n = Number(qty) || 0;
  if (n <= 0) return "hết hàng";
  if (n <= 5) return `sắp hết, còn ${n}`;
  return `còn hàng (${n})`;
};

/**
 * Tạo bộ công cụ gắn với một prisma cụ thể.
 * Trả về cả mảng tool (để bind vào model) lẫn map tên -> hàm (để vòng lặp
 * agent gọi lại khi model yêu cầu).
 */
export const createShoppingTools = (prisma) => {
  const lookupProduct = tool(
    async ({ query, limit }) => {
      const rows = await retrieveHybrid(prisma, query, {
        topK: Math.min(Math.max(Number(limit) || 4, 1), 8),
      });
      if (rows.length === 0) {
        return JSON.stringify({
          found: 0,
          note: "Không có sản phẩm nào khớp trong các gian hàng đang hoạt động.",
        });
      }
      return JSON.stringify({
        found: rows.length,
        currency: "USD",
        products: rows.map((r) => {
          const priced = priceOf(r);
          return {
            product_id: Number(r.id),
            name: r.name,
            list_price: priced.price,
            discount_amount: priced.discount,
            discount_percent: priced.discount_percentage,
            final_price: priced.final_price,
            stock: priced.quantity,
            stock_label: stockLabel(priced.quantity),
            shop: r.shop_name,
            url: productLink(r),
          };
        }),
      });
    },
    {
      name: "lookup_product",
      description:
        "Tra cứu sản phẩm đang bán để lấy giá hiện tại, phần trăm giảm giá, tồn kho và tên gian hàng. Luôn gọi công cụ này trước khi nói bất kỳ con số giá hoặc tình trạng còn hàng nào.",
      schema: z.object({
        query: z
          .string()
          .describe("Tên sản phẩm hoặc từ khoá, ví dụ 'Dell XPS 15', 'tai nghe chống ồn'"),
        limit: z
          .number()
          .optional()
          .describe("Số sản phẩm tối đa cần lấy, mặc định 4"),
      }),
    }
  );

  const checkStock = tool(
    async ({ product_id }) => {
      const id = BigInt(product_id);
      const product = await prisma.product.findFirst({
        where: { id, deleted_at: null, shop: { status: "active", deleted_at: null } },
        select: {
          id: true,
          name: true,
          quantity: true,
          price: true,
          discount: true,
          shop: { select: { name: true } },
          product_colors: {
            where: { deleted_at: null },
            select: { name: true, code: true, quantity: true },
          },
        },
      });

      if (!product) {
        return JSON.stringify({
          available: false,
          note: "Sản phẩm không tồn tại hoặc gian hàng đang không hoạt động.",
        });
      }

      const priced = priceOf(product);
      return JSON.stringify({
        available: true,
        product_id: Number(product.id),
        name: product.name,
        shop: product.shop?.name || null,
        list_price: priced.price,
        final_price: priced.final_price,
        total_stock: priced.quantity,
        stock_label: stockLabel(priced.quantity),
        by_color: priced.available_colors.map((c) => ({
          color: c.name || c.code,
          stock: c.quantity,
        })),
      });
    },
    {
      name: "check_stock",
      description:
        "Kiểm tra tồn kho thời gian thực của một sản phẩm theo product_id, kèm tồn kho từng màu.",
      schema: z.object({
        product_id: z
          .number()
          .describe("product_id lấy từ kết quả của lookup_product"),
      }),
    }
  );

  const getShopPolicy = tool(
    async ({ shop_name }) => {
      const shop = await prisma.shop.findFirst({
        where: {
          name: { contains: shop_name, mode: "insensitive" },
          status: "active",
          deleted_at: null,
        },
        select: {
          id: true,
          name: true,
          shipping_fee_override: true,
          free_shipping_threshold_override: true,
        },
      });

      // Chính sách của sàn dùng làm mức mặc định khi shop không tự đặt.
      const settings = await prisma.setting.findMany({
        where: { key: { in: ["shipping_fee", "free_shipping_threshold"] } },
        select: { key: true, value: true },
      });
      const platform = Object.fromEntries(
        settings.map((s) => [s.key, Number(s.value)])
      );

      if (!shop) {
        return JSON.stringify({
          found: false,
          note: "Không tìm thấy gian hàng đang hoạt động với tên này.",
          platform_default: {
            shipping_fee: platform.shipping_fee ?? null,
            free_shipping_threshold: platform.free_shipping_threshold ?? null,
          },
        });
      }

      const fee =
        shop.shipping_fee_override != null
          ? Number(shop.shipping_fee_override)
          : platform.shipping_fee ?? null;
      const threshold =
        shop.free_shipping_threshold_override != null
          ? Number(shop.free_shipping_threshold_override)
          : platform.free_shipping_threshold ?? null;

      return JSON.stringify({
        found: true,
        shop: shop.name,
        shipping_fee: fee,
        free_shipping_threshold: threshold,
        uses_own_policy: shop.shipping_fee_override != null,
      });
    },
    {
      name: "get_shop_policy",
      description:
        "Lấy phí vận chuyển và ngưỡng miễn phí ship của một gian hàng. Nếu gian hàng không tự đặt thì trả về mức mặc định của sàn.",
      schema: z.object({
        shop_name: z.string().describe("Tên gian hàng, ví dụ 'Tech World'"),
      }),
    }
  );

  const tools = [lookupProduct, checkStock, getShopPolicy];
  const byName = new Map(tools.map((t) => [t.name, t]));

  return { tools, byName };
};

/** Số vòng gọi công cụ tối đa, chặn trường hợp mô hình gọi lặp vô hạn. */
export const MAX_TOOL_ROUNDS = 3;
