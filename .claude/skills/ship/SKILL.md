---
name: ship
description: Kiểm chứng thay đổi (test backend, lint + build frontend) rồi commit và push thẳng lên main của NGX E-Commerce, không tạo PR. Dùng khi user nói "commit", "push", "ship", "xong rồi", "đẩy code lên", hoặc khi kết thúc một task.
---

# Kiểm chứng và giao

Chỉ chạy phần liên quan đến file đã đổi (`git status`, `git diff --stat`).

## 1. Backend (nếu đổi `backend/`)
1. DB lên chưa: `docker ps` có `ngx-e-commerce-db-1`. Chưa thì `docker compose up -d db` (Docker Desktop phải đang chạy).
2. Khởi động server ở nền: `cd backend && node server.js` (chạy background, đợi port 3000).
3. `cd backend && npm test` — lệnh này seed lại DB.
4. Dừng server. Chạy `npm run embed:products` để RAG có lại vector.

## 2. Frontend (nếu đổi `frontend/`)
1. `cd frontend && npm run lint`
2. `cd frontend && npm run build` (chỉ `vite build`, không type-check) rồi `npx tsc --noEmit -p tsconfig.json` để bắt lỗi kiểu.
3. Đổi luồng UI có spec e2e → `npm run e2e` (cần backend chạy).

## 3. Commit và push
- Có bước nào đỏ → dừng, báo lỗi nguyên văn, không commit.
- Bước nào bỏ qua (VD: Docker không chạy) → nói rõ với user là chưa chạy.
- `git add` đúng file của task. Không add `.env*`, `backups/`, file rác.
- Commit kiểu Conventional Commits.
- Đang ở branch khác → `git checkout main && git merge --ff-only <branch>`.
- `git push origin main`. **Không** `gh pr create`, **không** force push.
- Báo user: hash commit, lệnh đã chạy và kết quả.
