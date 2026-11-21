# NGX E-Commerce — Sàn thương mại điện tử đa gian hàng (Multi-shop Marketplace)

Đồ án xây dựng sàn TMĐT theo mô hình Shopee: nhiều seller mở gian hàng độc lập,
người mua đặt hàng từ nhiều shop trong một lần thanh toán, admin quản trị sàn.
Tích hợp AI: chatbot tư vấn (RAG + pgvector), tìm kiếm bằng hình ảnh, so sánh
sản phẩm bằng AI, gợi ý cá nhân hoá.

**Stack**: React 19 + Vite + TypeScript + TanStack Query · Node.js/Express ·
Prisma + PostgreSQL (pgvector) · Socket.IO · LangChain/Gemini · Docker.

---

## 1. Chạy dự án

### Cách 1 — Chạy dev tại máy (khuyên dùng khi demo)

```bash
# 1. Khởi động database (docker, port 55432)
docker compose up -d db

# 2. Migrate + seed dữ liệu demo
cd backend
npx prisma migrate deploy
npm run seed

# 3. Chạy cả backend + frontend từ thư mục gốc
cd ..
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api

> **Lưu ý port**: database chạy ở port **55432** (không phải 5432) vì máy dev
> có sẵn PostgreSQL 18 chiếm port 5432. `backend/.env` đã trỏ sẵn đúng port.

### Cách 2 — Docker toàn bộ

```bash
docker compose up
```

(Compose tự migrate + seed rồi khởi động backend và frontend.)

### Reset dữ liệu demo về trạng thái ban đầu

```bash
cd backend && npm run seed:full
```

> **Quan trọng trước khi demo AI**: `npm run seed` xoá sạch dữ liệu cũ, trong đó
> có bảng `product_embeddings`. Nếu chỉ chạy `npm run seed`, chatbot RAG sẽ âm
> thầm tụt xuống chế độ tìm theo từ khoá vì không còn vector nào để truy hồi.
> Dùng `npm run seed:full` (seed + sinh lại embedding), hoặc chạy `npm run seed`
> rồi **khởi động lại backend** — startup task sẽ tự sinh embedding.

---

## 2. Tài khoản demo

| Vai trò | Email | Mật khẩu | Ghi chú |
|---|---|---|---|
| **Admin sàn** | `admin@example.com` | `password123` | Quản trị `/admin` |
| **Seller 1** | `seller1@example.com` | `password123` | Chủ shop **Tech World** (điện thoại/laptop/tablet) |
| **Seller 2** | `seller2@example.com` | `password123` | Chủ shop **Gadget Hub** (âm thanh/wearable/camera/gaming) — phí ship riêng $4.99, freeship từ $150 |
| **Người mua** | `john@example.com`, `jane@example.com` | `password123` | Khách hàng thường (jane có sẵn đơn đã giao để demo đánh giá / trả hàng) |
| **Người chờ duyệt** | `seller3@example.com` | `password123` | Đã nộp hồ sơ mở shop "New Corner Store" (pending) |

**Voucher demo có sẵn**: `TECHWORLD10` (giảm 10% hàng Tech World, đơn tối thiểu $50),
`GADGET5` (giảm $5 hàng Gadget Hub, đơn tối thiểu $30), `WELCOME10`/`FLAT50` (voucher sàn).

---

## 3. Quay video demo

### 3.1. Chuẩn bị (5 phút trước khi quay)

1. Mở **Docker Desktop** (sau khi khởi động lại máy nó không tự chạy) → `docker compose up -d db`.
2. Reset dữ liệu demo về trạng thái đẹp (xoá đơn/người dùng sinh ra lúc thử, sinh lại embedding cho AI):
   ```bash
   npm run demo:reset
   ```
3. Chạy app: `npm run dev` (gốc repo) → mở http://localhost:5173.
   Nên đặt `RATE_LIMIT_ENABLED=false` trong `backend/.env` khi quay để không bị chặn đăng nhập
   nếu phải làm lại nhiều lần.
4. Trình duyệt: zoom 100%, cửa sổ 1440×900 hoặc toàn màn hình, tắt thông báo hệ thống,
   dùng cửa sổ ẩn danh để không lẫn phiên đăng nhập cũ.

### 3.2. Hai cách quay

- **Tự động (khuyên dùng để có bản dự phòng)**: Playwright tự đi qua toàn bộ kịch bản
  bên dưới, có chú thích tiếng Việt trên màn hình, và xuất video `.webm`:
  ```bash
  npm run demo:reset          # luôn reset trước khi quay
  npm run demo:record         # chạy ẩn, video ở frontend/demo-videos/
  npm --prefix frontend run demo:record:headed   # xem trực tiếp trong lúc quay
  ```
  Video `.webm` mở được bằng trình duyệt/VLC; muốn ra `.mp4` thì kéo vào
  https://handbrake.fr hoặc dùng `ffmpeg -i demo.webm demo.mp4`.
- **Tự thao tác + thuyết minh**: dùng **OBS Studio** (miễn phí) hoặc **Xbox Game Bar**
  có sẵn trên Windows (`Win + Alt + R` bắt đầu/dừng quay, video lưu ở `Videos\Captures`).
  Làm theo kịch bản 3.3, nói rõ mình đang demo vai trò nào.

### 3.3. Kịch bản (8–10 phút, đủ 3 vai trò + AI)

**Màn 1 — Người mua (john@example.com)**

1. **Trang chủ**: banner, danh mục, *Top deals*, *Featured shops* → thấy đây là sàn nhiều người bán.
2. **Tìm kiếm**: gõ `lap` → ra laptop (tìm theo một phần từ, không dấu vẫn ra).
   Tuỳ chọn: bấm icon camera để **tìm bằng ảnh**.
3. **Chi tiết sản phẩm** (Xiaomi 14): chọn biến thể 512GB (giá đổi theo), bấm **Collect**
   voucher `TECHWORLD10` của shop, xem thẻ shop + "More from Tech World" → **Add to cart**.
4. Thêm một sản phẩm Gadget Hub → **giỏ hàng nhóm theo shop**, có ô chọn từng sản phẩm/shop.
5. **Checkout**: địa chỉ lấy từ **sổ địa chỉ** (hoặc nhập mới + "Save this address"),
   **phí ship riêng từng shop**, mở **voucher picker** (hiện lý do voucher không dùng được,
   tự chọn voucher có lợi nhất) → đặt **COD** → trang thành công → **View order**.
6. **Đơn hàng của tôi**: tab To pay / To ship / To receive / Completed..., chi tiết đơn có
   timeline vận chuyển, tổng tiền tách rõ giảm giá. Với đơn đã giao (đăng nhập jane): **Buy again**,
   **Write review**, **Request return**.
7. **AI**: mở trợ lý AI, hỏi *"Tư vấn điện thoại chụp ảnh đẹp tầm 1000 đô"* → trả lời kèm thẻ sản phẩm.
   Tuỳ chọn: tick 2 sản phẩm → **Compare** → bảng so sánh do AI sinh.

**Màn 2 — Seller (seller1@example.com)**

1. **Seller dashboard**: khối **To-do** (chờ xác nhận / chờ giao / trả hàng / tin nhắn / sắp hết hàng).
2. **My Orders**: bấm *To confirm* → **Confirm** ngay trên dòng (hoặc chọn nhiều đơn → *Confirm selected*),
   **Export CSV**. Đơn MoMo chưa trả tiền hiện *Awaiting payment* (không cho giao).
3. **Chi tiết đơn**: **Create shipment** → **Print label** → giả lập vận chuyển (Demo) → delivered.
4. **My income**: đã giải ngân / đang chờ / phí sàn 5% / thực nhận.
5. **Products**: form có kiểm tra lỗi, **ma trận biến thể** (Color × Storage tự sinh dòng),
   bật/tắt **Live/Hidden**. **Shop Vouchers**: sửa / tạm dừng / hẹn giờ voucher.

**Màn 3 — Đăng ký bán hàng + Admin**

1. Đăng nhập `charlie@example.com` (user thường, chưa có shop — đăng ký tài khoản mới thì
   phải nhập mã gửi qua email) → Profile → **Sell on Marketplace** → wizard 4 bước
   (thông tin shop → địa chỉ lấy hàng → thuế → xác nhận) → trạng thái *Under review*.
2. **Admin** (`/admin`): To-do → *Shop applications* → **Review** hồ sơ → **Approve**
   (Reject bắt buộc ghi lý do). User được chuyển thành seller ngay.
3. **Kiểm duyệt**: Products → **Take down** một sản phẩm kèm lý do → người mua không thấy nữa,
   seller không tự bật lại được → **Restore**.
4. **Customers**: **Suspend** một tài khoản → người đó bị đăng xuất ngay và thấy lý do; khoá seller
   thì shop của họ cũng tạm ngừng bán → **Unsuspend**.

> Mẹo: quay từng màn thành file riêng rồi ghép, lỡ sai thì chỉ quay lại một màn.
> Trước mỗi lần quay lại toàn bộ, chạy `npm run demo:reset`.

---

## 4. Kiến trúc chính (tóm tắt cho báo cáo)

- **Đa gian hàng**: `Shop` (1 user – 1 shop, vòng đời pending → active →
  suspended/rejected) · `Product.shop_id` · Checkout tách `OrderGroup`
  (1 lần mua) → N `Order` (mỗi shop 1 đơn, tự quản trạng thái).
- **Thanh toán**: 3 phương thức COD / VNPay / MoMo. 1 `Payment` gắn với
  `OrderGroup`; IPN từ cổng thanh toán cập nhật đồng
  loạt các đơn con. Tổng các đơn con luôn khớp tuyệt đối tổng checkout
  (chia khuyến mãi theo tỉ lệ, đơn cuối hấp thụ sai số làm tròn).
- **Bảo mật**: `helmet` đặt header bảo vệ, `express-rate-limit` chia 3 mức
  (chung / xác thực / endpoint gọi Gemini), secret JWT bắt buộc lấy từ biến
  môi trường và fail-fast nếu thiếu, truy vấn raw SQL đều tham số hoá.
- **Hằng số tập trung**: `constants/status.js` giữ toàn bộ trạng thái vòng đời
  (shop / đơn hàng / thanh toán / đổi trả) cùng bảng chuyển trạng thái hợp lệ,
  thay cho chuỗi rời rạc — tránh nhầm `cancelled` (đơn) với `canceled` (thanh toán).
- **Lưới an toàn lỗi**: `middleware/error.middleware.js` gom 404 và xử lý lỗi về
  một chỗ; `middleware/validateId.middleware.js` chặn ID sai ngay tầng route nên
  đầu vào hỏng trả 400 thay vì 500 kèm thông báo nội bộ.
- **Phân quyền 3 lớp**: `protectRoute` (JWT) → `adminRoute`/`sellerRoute`
  (vai trò) → `requireShopOwnership` (đúng shop sở hữu tài nguyên).
- **Voucher 2 cấp**: voucher sàn (giảm cả giỏ) và voucher shop (chỉ giảm phần
  hàng của shop đó, seller tự tạo, hiển thị trên trang shop).
- **Phí ship theo shop**: shop tự đặt phí + ngưỡng freeship, fallback về
  cấu hình sàn.
- **Đổi/trả**: `ReturnRequest` (buyer yêu cầu trên đơn delivered → seller
  approve/reject; approve tự hoàn kho + đơn chuyển `returned`).
- **Chat 2 kênh**: buyer ↔ admin sàn (hỗ trợ) và buyer ↔ seller (theo shop),
  realtime qua Socket.IO + polling fallback.
- **AI**: RAG trên pgvector (chatbot), Gemini Vision (tìm bằng ảnh), so sánh
  sản phẩm sinh bảng có cấu trúc, collaborative filtering (gợi ý). Mọi nguồn
  hiển thị sản phẩm đều lọc shop `active`.
- **Vận chuyển**: provider mock / GHN / GHTK (`services/shipping/`), phí theo
  cân nặng + tỉnh (`shipping_rate_mode=carrier`), vận đơn, nhãn in, webhook
  trạng thái có token riêng mỗi hãng, job đồng bộ dự phòng, đối soát COD.
- **Tồn kho theo biến thể (SKU)**: `ProductVariant` (thuộc tính, chênh giá, tồn
  riêng), trừ kho có điều kiện khi checkout; đơn MoMo chưa trả bị huỷ và hoàn kho.
- **Chống gian lận**: OTP số điện thoại, chấm điểm rủi ro lúc checkout (tốc độ
  đặt đơn, tự mua của shop, lạm dụng voucher theo thiết bị/SĐT/địa chỉ), quét
  review giả, và phát hiện shipper gian lận (giao giả, giữ COD, khu vực bất
  thường theo kiểm định z, Gemini viết nhận định) — admin xử lý ở trang Fraud.
- **Hoá đơn & thuế**: hoá đơn VAT phát hành khi giao, khấu trừ thuế hộ kinh
  doanh (1% VAT + 0,5% TNCN), bút toán đảo khi trả hàng ghi vào kỳ phát sinh.

## 5. Tài liệu thiết kế & số liệu thực nghiệm

| Tài liệu | Nội dung | Sinh bằng |
|---|---|---|
| [`backend/docs/erd.md`](backend/docs/erd.md) | ERD 42 bảng, chia theo 6 miền nghiệp vụ | `npm run docs:erd` — đọc thẳng `schema.prisma` nên không bao giờ lệch |
| [`backend/docs/architecture.md`](backend/docs/architecture.md) | Kiến trúc tổng thể, sơ đồ tuần tự (tách đơn, RAG, IPN MoMo), máy trạng thái đơn & shop, phân quyền 3 lớp | viết tay |
| [`backend/docs/ai-evaluation.md`](backend/docs/ai-evaluation.md) | Số liệu đo thật: độ chính xác truy hồi RAG, ma trận nhầm lẫn kiểm duyệt, độ phủ gợi ý | `npm run eval:ai` |

Sơ đồ viết bằng Mermaid nên hiển thị trực tiếp trên GitHub.

```bash
cd backend
npm run docs:erd     # sinh lại ERD sau khi đổi schema
npm run eval:ai      # đo lại chất lượng AI (gọi Gemini thật, mất vài phút)
npm run eval:ai -- --quick   # bản rút gọn khi chỉ cần thử
```

> `eval:ai` yêu cầu backend đang chạy và đã có embedding. Kết quả ghi đè
> `docs/ai-evaluation.md` — đây là số liệu để đưa vào chương thực nghiệm.

---

## 6. Kiểm thử

Bộ kiểm thử API end-to-end viết bằng **node:test** (test runner có sẵn của
Node.js, không cần cài thêm), chia 26 suite theo nghiệp vụ trong `backend/tests/`:

| Suite | Phạm vi |
|---|---|
| `01-auth` | Đăng nhập, token, vai trò |
| `02-authz` | Ma trận phân quyền admin/seller/user, ownership theo shop |
| `03-shops` | Vòng đời shop: apply → reject → resubmit → approve → suspend |
| `04-products` | CRUD sản phẩm theo shop, ẩn toàn diện khi shop bị đình chỉ |
| `05-cart` | Giỏ hàng + thông tin shop trên từng item |
| `06-vouchers` | Voucher sàn/voucher shop, validate, CRUD của seller |
| `07-marketplace-flow` | Checkout tách đơn, phí ship theo shop, điểm loyalty, máy trạng thái đơn, đổi/trả, chat buyer↔seller |
| `08-loyalty-notifications` | Điểm thưởng, thông báo broadcast |
| `09-payment-security` | Xác minh chữ ký HMAC của IPN MoMo: chặn callback giả mạo, sửa số tiền, sửa resultCode |
| `10-api-contract` | Hợp đồng tầng hạ tầng: 404 dạng JSON, ID sai trả 400 (không phải 500), lỗi không lộ chi tiết nội bộ |
| `11-business-rules` | Quy tắc nghiệp vụ: voucher không bị dùng vượt hạn mức khi mua đồng thời, bảng chi tiết tiền cộng đúng bằng tổng, mọi trạng thái đơn đều chuyển tiếp được, đơn huỷ không tính vào doanh thu |
| `12`–`18` | AI guard chống prompt injection, truy hồi RRF + cache, tranh chấp tồn kho/IPN, tính giá, analytics hành vi, health metrics |
| `19-shipping` | Phí ship, vận đơn, nhãn, webhook, mô phỏng giao, đối soát COD |
| `20-variants` | Biến thể SKU: giỏ, đơn, trừ/hoàn kho, tranh chấp đơn vị cuối, hết hạn giữ chỗ |
| `21-fraud` | OTP, chặn COD chưa xác thực, chấm điểm checkout, lạm dụng voucher, review giả |
| `22-invoice-tax` | Hoá đơn VAT, phân quyền xem, khấu trừ thuế hộ kinh doanh |
| `23`–`25` | Hồi quy sau các vòng review (số lượng âm, giá ≤ 0, vận đơn còn sống, giờ VN, kỳ thuế) |
| `26-shipper-fraud` | Luật phát hiện shipper gian lận, kiểm định khu vực, báo chưa nhận hàng |

Giao diện có thêm E2E bằng Playwright (`frontend/e2e/`, chạy `cd frontend && npm run e2e`).

```bash
# Yêu cầu: backend đang chạy (npm run dev). Lệnh test tự seed lại dữ liệu.
cd backend
npm test
```

### Kiểm tra sẵn sàng trước khi demo

Mười một suite ở trên là kiểm thử hồi quy: chúng **seed lại dữ liệu** rồi kiểm chứng
nghiệp vụ. Còn `test:demo` chạy trên **đúng dữ liệu sắp đem đi demo** và **chỉ
đọc** — không tạo đơn, không đình chỉ shop, không đổi trạng thái gì:

```bash
cd backend
npm run test:demo
```

Bộ này soi lại toàn bộ kịch bản demo ở mục 3: 5 tài khoản đăng nhập được, hai
gian hàng còn active và còn hàng, Gadget Hub còn phí ship riêng, 4 mã voucher
còn hiệu lực, còn đơn mở shop chờ duyệt cho Màn 3, dashboard seller còn khối
doanh thu/phí sàn, và **quan trọng nhất: `product_embeddings` không rỗng** —
đây là cái bẫy hay gặp nhất vì `npm run seed` xoá sạch bảng này và làm chatbot
RAG âm thầm tụt xuống chế độ tìm theo từ khoá.

Muốn kiểm chứng luôn cả đường RAG thật (tốn một lượt gọi Gemini):

```bash
DEMO_CHECK_AI=1 npm run test:demo
```

> Thứ tự khuyên dùng ngay trước buổi bảo vệ:
> `npm run seed:full` → khởi động backend → `npm run test:demo` → tất cả xanh thì demo.

## 7. Vận hành & hạ tầng

Job nền (worker), backup DB, CI và checklist production: xem [docs/ops-infra.md](docs/ops-infra.md).
