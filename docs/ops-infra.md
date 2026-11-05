# Van hanh & ha tang

## 1. Job nen

Dinh nghia o `backend/jobs/registry.js`; scheduler o `backend/jobs/scheduler.js`.
Moi job la mot script chay trong process con, tu lay advisory lock
(`jobs/lib/jobLock.js`) nen nhieu instance cung chay van khong chay trung.
Moi job mot co "dang chay": chu ky toi ma lan truoc chua xong thi bo qua.

| Job | Script | Chu ky | Bien tat |
|---|---|---|---|
| daily-recommendation | `runDailyRecommendationJobs.js` | 24h (`DAILY_JOBS_INTERVAL_HOURS`) | `DAILY_JOBS_ENABLED=0`, `DAILY_JOBS_RUN_ON_START=0` |
| expire-unpaid-orders | `expireUnpaidOrders.js` | 5 phut, chay ngay khi khoi dong | `JOB_EXPIRE_UNPAID_ORDERS_ENABLED=0` |
| sync-shipments | `syncShipments.js` | 30 phut | `JOB_SYNC_SHIPMENTS_ENABLED=0` |
| fraud-review-scan | `scanSuspiciousReviews.js` | 24h | `JOB_FRAUD_REVIEW_SCAN_ENABLED=0` |

### In-process hay worker

- Mac dinh (`JOBS_IN_API` khong dat hoac `1`): API tu chay scheduler.
- `JOBS_IN_API=0`: API khong chay job; chay process rieng `npm run worker`
  (`backend/jobs/worker.js`, khong mo HTTP). Worker nhan SIGTERM/SIGINT thi
  ngung lap lich, doi job dang chay toi da 25s roi moi thoat.
- Task khoi dong (embedding san pham, setup similarity) van nam o API.
- `docker compose up` da dung che do nay: `backend` co `JOBS_IN_API=0`,
  service `worker` chay job.

### Chay tay mot job

```
cd backend
npm run job:expire-unpaid-orders
npm run job:sync-shipments
npm run job:fraud-review-scan
npm run job:daily-recommendation
```

## 2. Backup DB

Service `db-backup` (docker-compose) chay `backend/scripts/backup-db.sh`:
`pg_dump -Fc` vao thu muc `./backups` (da gitignore), giu 7 ban moi nhat.
Doi bang env: `BACKUP_INTERVAL_HOURS` (mac dinh 24), `BACKUP_KEEP` (mac dinh 7).

Backup ngay lap tuc:

```
docker compose exec -e BACKUP_ONCE=1 db-backup sh /backup-db.sh
```

Restore (se ghi de du lieu hien tai; dung backend/worker truoc):

```
docker compose stop backend worker
docker compose exec -T db dropdb -U postgres --if-exists ecommerce
docker compose exec -T db createdb -U postgres ecommerce
docker compose exec -T db pg_restore -U postgres -d ecommerce --no-owner < backups/ecommerce-YYYYMMDD-HHMMSS.dump
docker compose start backend worker
```

Luu y: dev DB thuc te la container `ngx-ecommerce-db` o cong host 55432.

## 3. CI (`.github/workflows/ci.yml`)

Chay khi push va pull request.

- `backend`: Postgres `pgvector/pgvector:pg15`, Node 22, `npm ci`,
  `prisma migrate deploy`, seed, khoi dong server nen
  (`JOBS_IN_API=0`, `AUTO_EMBED_PRODUCTS=0`, `RATE_LIMIT_ENABLED=0`), cho cong 3000, `npm test`.
- `frontend`: `npm ci` + `npm run build`.
- Test MoMo sandbox goi mang ngoai nen co the fail khi dich vu ben thu ba loi;
  khong tat test, xem log de phan biet.
- Test AI can `GEMINI_API_KEY`; CI khong cap, cac test phu thuoc AI nen duoc xem xet rieng.

## 4. Checklist production

- [ ] `ACCESS_TOKEN_SECRET` sinh ngau nhien, khong dung gia tri mau; moi secret nam ngoai git.
- [ ] `SHIPPING_WEBHOOK_SECRET` dat gia tri manh; cau hinh cung secret o GHN/GHTK.
- [ ] Setting `shipping_rate_mode` (`flat` mac dinh, `carrier` de tinh phi theo hang van chuyen) va provider
      (mac dinh `mock`; dung GHN/GHTK can `GHN_TOKEN`, `GHN_SHOP_ID`, `GHTK_TOKEN`).
      Adapter GHN/GHTK chua kiem chung tren sandbox that.
- [ ] Setting `cod_require_verified_phone` = true (mac dinh false).
- [ ] `SMS_PROVIDER` doi tu `mock` sang nha cung cap that, neu khong OTP chi in ra log.
- [ ] Hoa don dien tu: hien chi co provider `internal`; tich hop VNPT/Viettel/MISA dang cho quyet dinh.
- [ ] `JOBS_IN_API=0` va chay it nhat mot worker; `RATE_LIMIT_ENABLED` bat.
- [ ] Backup chay va da thu restore it nhat mot lan.
