---
name: feature
description: Thêm tính năng mới (backend API, trang frontend, hoặc cả hai) cho NGX E-Commerce theo đúng phân tầng và có test. Dùng khi user nói "thêm tính năng", "làm chức năng", "build feature", "add endpoint", "thêm trang".
---

# Thêm tính năng

## 1. Khám phá (chưa sửa file nào)
- Đọc `PROGRESS.md` mục 0 và task liên quan ở mục 4 — lấy "Tiêu chí nghiệm thu".
- Tìm code gần giống để làm theo: route + controller + service cùng domain, hook + service frontend cùng area (`admin`, `seller`, `client`).
- Liệt kê file sẽ chạm. Nếu cần đổi schema → làm theo skill `db-change` trước.

## 2. Kế hoạch
- Viết kế hoạch ngắn (file, endpoint, shape response, test) cho user xem nếu task > 3 file hoặc mơ hồ. Task nhỏ thì làm luôn.
- Câu hỏi nào đổi hướng thiết kế (quyền truy cập, tiền, dữ liệu bị xoá) thì hỏi user, đừng đoán.

## 3. Code
Backend, theo thứ tự:
1. `services/<domain>.service.js` — nghiệp vụ, không đụng `req`/`res`.
2. `controllers/<domain>.controller.js` — đọc `req`, gọi service, trả `res`.
3. `routes/<domain>.route.js` — gắn middleware (`protectRoute`, `adminRoute`, `sellerRoute`, `registerIdParams`).
4. Ghi audit/notify nếu domain tương tự đang làm (`writeAuditLog`, `notifyUser`).

Frontend:
1. `src/<area>/services/<x>Service.ts` gọi API qua `src/lib/axios.ts`.
2. `src/<area>/hooks/use<X>.ts` bọc TanStack Query; export ở `hooks/index.ts`.
3. Component/trang dùng component dùng chung có sẵn (`Modal`, `AdminPagination`, `SkeletonTable`...).

## 4. Test
- Backend: thêm `backend/tests/NN-<ten>.test.mjs` (NN = số lớn nhất + 1). Có cả ca thành công, ca thiếu quyền (401/403), ca dữ liệu sai (400).
- Luồng UI quan trọng: cân nhắc thêm spec ở `frontend/e2e/`.

## 5. Kiểm chứng và giao
- Chạy skill `ship`. Tính năng chưa xong nếu chưa có test xanh chứng minh tiêu chí nghiệm thu.
- Sửa code lõi → cập nhật `backend/docs/architecture.md`. Xong task → ghi vào `PROGRESS.md` mục 6.
