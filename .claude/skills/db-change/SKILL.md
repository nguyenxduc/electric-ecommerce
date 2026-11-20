---
name: db-change
description: Đổi schema database của NGX E-Commerce bằng Prisma migration (thêm bảng, cột, index, ràng buộc unique), sinh lại client và ERD. Dùng khi task cần "thêm cột", "thêm bảng", "migration", "đổi schema", "index".
---

# Đổi schema

DB dev là docker `ngx-e-commerce-db-1` ở port **55432** (5432 là PostgreSQL 18 khác trên máy). Chưa chạy thì: `docker compose up -d db`.

## Bước
1. Đọc `backend/prisma/schema.prisma` và vài migration gần nhất trong `backend/prisma/migrations/` để theo cùng kiểu đặt tên.
2. Sửa `schema.prisma`.
3. `cd backend && npx prisma migrate dev --name <ten_snake_case>` — tạo migration và áp vào DB dev.
4. Đọc file `migration.sql` vừa sinh. Kiểm tra:
   - Thêm cột `NOT NULL` vào bảng có dữ liệu → cần `DEFAULT` hoặc bước backfill.
   - Thêm `UNIQUE` → dữ liệu cũ có trùng không? Nếu có, migration phải dọn trước.
   - Có `DROP` cột/bảng → **hỏi user trước**, đây là mất dữ liệu.
   - Phần pgvector / full-text (`sql/`, search vector) Prisma không quản → viết SQL tay trong migration.
5. Cập nhật seed (`backend/seed/`) nếu cột mới cần dữ liệu demo.
6. `npm run docs:erd` → `backend/docs/erd.md`.
7. Commit schema + thư mục migration + ERD cùng nhau.

Không sửa migration đã có trên `main`. Muốn đổi → tạo migration mới.
