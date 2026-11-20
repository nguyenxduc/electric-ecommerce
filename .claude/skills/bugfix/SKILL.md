---
name: bugfix
description: Sửa lỗi trong NGX E-Commerce theo cách tái hiện bằng test trước, tìm nguyên nhân gốc, rồi sửa một lần ở code dùng chung. Dùng khi user báo "lỗi", "bug", "không chạy", "sai", "crash", dán stack trace hoặc log.
---

# Sửa lỗi

## 1. Tái hiện
- Lấy đủ thông tin: request/URL, tài khoản (xem `ACCOUNTS` trong `backend/tests/helpers.mjs`), log server, console trình duyệt.
- Viết test thất bại trước: thêm ca vào file `backend/tests/*.test.mjs` cùng domain (hoặc spec e2e nếu lỗi ở UI). Chạy và xác nhận nó **đỏ đúng lý do**.
- Không tái hiện được → báo user điều đã thử, đừng sửa mò.

## 2. Nguyên nhân gốc
- Đọc luồng route → controller → service liên quan.
- `grep` mọi nơi gọi hàm định sửa. Sửa ở chỗ dùng chung một lần, không vá từng caller.
- Lỗi lặp ở nhiều nơi giống nhau → nêu ra cho user, sửa hết trong cùng commit.

## 3. Sửa
- Diff nhỏ nhất làm test xanh. Không refactor kèm.
- Giữ nguyên validation và xử lý lỗi hiện có.

## 4. Kiểm chứng
- Test mới xanh, test cũ vẫn xanh: chạy skill `ship`.
- Commit `fix(<scope>): <mô tả triệu chứng đã hết>`.
