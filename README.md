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
cd backend && npm run seed
```

---

## 2. Tài khoản demo

| Vai trò | Email | Mật khẩu | Ghi chú |
|---|---|---|---|
| **Admin sàn** | `admin@example.com` | `password123` | Quản trị `/admin` |
| **Seller 1** | `seller1@example.com` | `password123` | Chủ shop **Tech World** (điện thoại/laptop/tablet) |
| **Seller 2** | `seller2@example.com` | `password123` | Chủ shop **Gadget Hub** (âm thanh/wearable/camera/gaming) — có phí ship riêng $4.99, freeship từ $150 |
| **Người mua** | `john@example.com` | `password123` | Khách hàng thường |
| **Người chờ duyệt** | `seller3@example.com` | `password123` | Đã nộp đơn mở shop "New Corner Store" (pending) |

**Voucher demo có sẵn**: `TECHWORLD10` (giảm 10% hàng Tech World, đơn tối thiểu $50),
`GADGET5` (giảm $5 hàng Gadget Hub, đơn tối thiểu $30), `WELCOME10`/`FLAT50` (voucher sàn).

---

## 3. Kịch bản demo (7–10 phút, đủ 3 vai trò + AI)

### Màn 1 — Người mua (john@example.com)

1. **AI chatbot**: mở bong bóng chat AI, hỏi *"Tư vấn cho tôi điện thoại chụp
   ảnh đẹp tầm $1000"* → AI trả lời kèm card sản phẩm, nêu tên gian hàng bán.
2. **Tìm bằng ảnh**: bấm icon camera trên thanh tìm kiếm, thả ảnh một chiếc
   iPhone/tai nghe → hệ thống nhận diện và trả sản phẩm khớp.
3. **So sánh AI**: tick chọn 2 điện thoại → bấm Compare → bảng so sánh do AI
   sinh, có khuyến nghị "nên mua cái nào".
4. **Trang gian hàng**: vào chi tiết sản phẩm → bấm "Sold by Tech World" →
   trang shop có banner, đánh giá, **voucher của shop** (copy mã `TECHWORLD10`),
   nút **Chat with shop** (nhắn thử một câu — seller sẽ nhận được ở Màn 2).
5. **Giỏ hàng nhiều shop**: thêm 1 điện thoại (Tech World) + 1 tai nghe
   (Gadget Hub) → giỏ hàng nhóm theo shop.
6. **Checkout tách đơn**: trang thanh toán hiển thị **phí ship riêng từng shop**
   (Gadget Hub rẻ hơn vì shop tự đặt phí), dán mã `TECHWORLD10` → giảm giá chỉ
   áp cho phần hàng Tech World. Đặt COD → trang kết quả hiện **2 mã đơn**
   (mỗi shop một đơn, chung một mã checkout GRP-...).
   - *Tuỳ chọn*: demo thanh toán MoMo sandbox thay vì COD.

### Màn 2 — Seller (seller1@example.com)

1. Đăng nhập → chuông thông báo hiện **"New order 🛒"** → vào Seller Dashboard.
2. **Dashboard**: doanh thu 7 ngày, đơn chờ xử lý, top sản phẩm, và khối
   **"Doanh thu − 5% phí sàn = thực nhận"** (trả lời câu hỏi dòng tiền).
3. **My Orders**: thấy đúng đơn con của shop mình (không thấy đơn shop khác) →
   chuyển trạng thái sang *processing* → *shipped* → *delivered*.
4. **Buyer Chat**: trả lời tin nhắn người mua đã gửi ở Màn 1.
5. **Shop Vouchers**: tạo nhanh một voucher mới cho shop.
6. **Returns**: (sau khi đơn delivered, quay lại vai người mua bấm "Request
   Return" trong lịch sử đơn) → seller vào tab Returns → **Approve** → hàng tự
   nhập kho lại, đơn chuyển "returned", người mua nhận thông báo.

### Màn 3 — Đăng ký shop + Admin duyệt

1. Đăng nhập user thường bất kỳ (vd `jane@example.com`) → Profile → tab
   **"Sell on Marketplace"** → điền đơn mở shop → trạng thái *pending*.
2. Đăng nhập **admin** → `/admin` → mục **Shops** → hàng chờ có đơn mới +
   "New Corner Store" seed sẵn → bấm **Approve** (hoặc Reject kèm lý do).
3. Người nộp đơn nhận thông báo duyệt, role tự chuyển thành **seller**, vào
   được Seller Dashboard ngay; shop xuất hiện công khai tại `/shop/<slug>`.
4. (Điểm cộng demo) Admin bấm **Suspend** một shop → toàn bộ sản phẩm của shop
   biến mất khỏi trang chủ, tìm kiếm, gợi ý AI và không thể thêm vào giỏ.

---

## 4. Kiến trúc chính (tóm tắt cho báo cáo)

- **Đa gian hàng**: `Shop` (1 user – 1 shop, vòng đời pending → active →
  suspended/rejected) · `Product.shop_id` · Checkout tách `OrderGroup`
  (1 lần mua) → N `Order` (mỗi shop 1 đơn, tự quản trạng thái).
- **Thanh toán**: 1 `Payment` gắn với `OrderGroup`; IPN MoMo cập nhật đồng
  loạt các đơn con. Tổng các đơn con luôn khớp tuyệt đối tổng checkout
  (chia khuyến mãi theo tỉ lệ, đơn cuối hấp thụ sai số làm tròn).
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

## 5. Kiểm thử

Bộ kiểm thử API end-to-end viết bằng **node:test** (test runner có sẵn của
Node.js, không cần cài thêm), chia 8 suite theo nghiệp vụ trong `backend/tests/`:

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

```bash
# Yêu cầu: backend đang chạy (npm run dev). Lệnh test tự seed lại dữ liệu.
cd backend
npm test
```
