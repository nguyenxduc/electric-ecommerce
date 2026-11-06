# Ket qua do tai (load test)

> Sinh tu `npm run eval:load` luc 2026-11-05 03:27.

Đo trên máy dev, không phải môi trường production.

May do: win32, 16 CPU.
Lenh da chay: `LOAD_CONCURRENCY=200 LOAD_ROUNDS=5 LOAD_WARMUP=1 npm run eval:load`

| endpoint | n | p50 | p95 | p99 | max | non-2xx | 5xx |
|---|---|---|---|---|---|---|---|
| GET /api/products?limit=20 | 1000 | 253ms | 424ms | 470ms | 482ms | 0 | 0 |
| GET /api/products/:id | 1000 | 95ms | 191ms | 247ms | 248ms | 0 | 0 |
| GET /api/categories | 1000 | 77ms | 101ms | 105ms | 107ms | 0 | 0 |

- GET /api/products?limit=20: p95 424ms — đạt < 500ms
- GET /api/products/:id: p95 191ms — đạt < 500ms
- GET /api/categories: p95 101ms — đạt < 500ms
