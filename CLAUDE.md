# CLAUDE.md — NGX E-Commerce

Sàn TMĐT đa gian hàng. Backend Node/Express + Prisma + PostgreSQL (pgvector), frontend React 19 + Vite + TS + TanStack Query, AI bằng LangChain/Gemini.

**Đọc trước khi code:** [PROGRESS.md](PROGRESS.md) mục 0 (quy ước bắt buộc) và mục 4 (task + tiêu chí nghiệm thu). File đó là nguồn sự thật về tiến độ; CLAUDE.md này không lặp lại nó.

## Lệnh

| Việc | Lệnh |
|---|---|
| DB dev (docker, port **55432**) | `docker compose up -d db` |
| Chạy cả 2 app | `npm run dev` (gốc repo) |
| Backend test | `cd backend && npm test` — cần `node server.js` đang chạy ở terminal khác; lệnh này **seed lại DB** |
| Sau khi test/seed | `cd backend && npm run embed:products` (không thì RAG tụt về tìm từ khoá) |
| Frontend lint / build | `cd frontend && npm run lint` · `npm run build` |
| E2E | `cd frontend && npm run e2e` (cần backend + DB) |
| Migration | `cd backend && npx prisma migrate dev --name <ten>` rồi `npm run docs:erd` |

## Quy tắc code

- Backend một chiều: route → controller → service → dữ liệu. Controller không import controller khác. Service không biết `req`/`res`/mã HTTP.
- Trước khi viết helper mới, tìm trong `backend/lib/`, `backend/services/`, `frontend/src/*/hooks`, `frontend/src/*/services`.
- Tiếng Việt: dùng `backend/lib/vietnamese.js`, không tự `normalize("NFD")`.
- Frontend: gọi API qua service (`src/<area>/services/*Service.ts`) + hook TanStack Query (`src/<area>/hooks/use*.ts`), axios từ `src/lib/axios.ts`.
- Test backend mới: `backend/tests/NN-<ten>.test.mjs` (số kế tiếp), dùng `req`, `login`, `ACCOUNTS` từ `tests/helpers.mjs`, `node:test` + `node:assert/strict`.
- Sửa code lõi thì sửa luôn `backend/docs/architecture.md`. Đổi schema thì sinh lại ERD.
- Comment và tài liệu viết tiếng Việt như code hiện có.

## Workflow

Mỗi task: **khám phá → kế hoạch → code → kiểm chứng → commit**. Dùng skill tương ứng:

- `/feature` — thêm tính năng
- `/bugfix` — sửa lỗi (viết test tái hiện trước)
- `/db-change` — đổi schema Prisma
- `/ship` — chạy kiểm tra, commit và push

## Git

- **Không tạo PR.** Commit thẳng lên `main` rồi `git push origin main`.
- Commit message theo Conventional Commits (`feat(scope): ...`, `fix(...)`, `chore:`, `docs:`).
- Không commit khi test đỏ. Không commit file `.env*` (trừ `.env.example`).
