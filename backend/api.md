# E-Commerce Store API Documentation

## Authentication

### POST /api/auth/register

- Đăng ký tài khoản mới
- Body: `{ name, email, password }`

### POST /api/auth/login

- Đăng nhập
- Body: `{ email, password }`

---

## Users

### GET /api/users/me

- Lấy thông tin user hiện tại (yêu cầu đăng nhập)

---

## Products

### GET /api/products

- Lấy danh sách sản phẩm

### GET /api/products/:id

- Lấy chi tiết sản phẩm

### POST /api/products

- Thêm sản phẩm mới (admin/shop)

### PUT /api/products/:id

- Cập nhật sản phẩm (admin/shop)

### DELETE /api/products/:id

- Xóa sản phẩm (admin/shop)

---

## Product Types

### GET /api/product-types

- Lấy danh sách loại sản phẩm

### POST /api/product-types

- Thêm loại sản phẩm (admin)

### PUT /api/product-types/:id

- Cập nhật loại sản phẩm (admin)

### DELETE /api/product-types/:id

- Xóa loại sản phẩm (admin)

---

## Cart

### GET /api/cart

- Lấy giỏ hàng của user

### POST /api/cart

- Thêm sản phẩm vào giỏ

### PUT /api/cart

- Cập nhật số lượng sản phẩm trong giỏ

### DELETE /api/cart/:productId

- Xóa sản phẩm khỏi giỏ

---

## Wishlist

### GET /api/wishlist

- Lấy wishlist của user

### POST /api/wishlist

- Thêm sản phẩm vào wishlist

### DELETE /api/wishlist/:productId

- Xóa sản phẩm khỏi wishlist

---

## Orders

### GET /api/orders

- Lấy danh sách đơn hàng của user

### GET /api/orders/:id

- Lấy chi tiết đơn hàng

### POST /api/orders

- Tạo đơn hàng mới

---

## Coupons

### GET /api/coupons

- Lấy danh sách mã giảm giá

### POST /api/coupons

- Thêm mã giảm giá (admin)

### PUT /api/coupons/:id

- Cập nhật mã giảm giá (admin)

### DELETE /api/coupons/:id

- Xóa mã giảm giá (admin)

---

## Reviews

### GET /api/reviews?productId=xxx

- Lấy danh sách review của sản phẩm

### POST /api/reviews

- Thêm review cho sản phẩm

### PUT /api/reviews/:id

- Cập nhật review

### DELETE /api/reviews/:id

- Xóa review

---

## Chat

### GET /api/chats

- Lấy danh sách chat của user

### POST /api/chats

- Tạo cuộc trò chuyện mới

### GET /api/chats/:id/messages

- Lấy tin nhắn trong chat

### POST /api/chats/:id/messages

- Gửi tin nhắn trong chat

---

**Lưu ý:**

- Các endpoint có thể yêu cầu xác thực (token JWT).
- Các endpoint admin cần quyền admin.

Bạn có thể mở rộng chi tiết từng endpoint theo nhu cầu!
