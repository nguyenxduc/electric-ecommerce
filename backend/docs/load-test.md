# Ket qua do tai (load test)

> Sinh tu `npm run eval:load` luc 2026-11-28 12:29.

Đo trên máy dev, không phải môi trường production.

May do: win32, 16 CPU.
Lenh da chay: `LOAD_CONCURRENCY=300 LOAD_ROUNDS=5 LOAD_WARMUP=1 npm run eval:load`

| endpoint | n | p50 | p95 | p99 | max | non-2xx | 5xx |
|---|---|---|---|---|---|---|---|
| GET /api/products?limit=20 | 1500 | 164ms | 289ms | 300ms | 301ms | 0 | 0 |
| GET /api/products/:id | 1500 | 166ms | 205ms | 211ms | 214ms | 0 | 0 |
| GET /api/categories | 1500 | 143ms | 194ms | 202ms | 208ms | 0 | 0 |

- GET /api/products?limit=20: p95 289ms — đạt < 500ms
- GET /api/products/:id: p95 205ms — đạt < 500ms
- GET /api/categories: p95 194ms — đạt < 500ms
