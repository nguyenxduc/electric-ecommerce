// Danh sach job chay tu dong. Moi job la mot script rieng chay trong process
// con (loi/ro ri bo nho cua job khong keo theo API). Script tu lay advisory
// lock (jobs/lib/jobLock.js) nen chay nhieu instance cung khong chay trung.
//
// everyMinutes: chu ky; runOnStart: chay ngay khi scheduler khoi dong.
// Tat mot job: <ENV_KEY>_ENABLED=0, vd. JOB_EXPIRE_UNPAID_ORDERS_ENABLED=0.

const hours = (h) => h * 60;

export const JOBS = [
  {
    name: "daily-recommendation",
    file: "runDailyRecommendationJobs.js",
    envKey: "DAILY_JOBS",
    everyMinutes: hours(Number(process.env.DAILY_JOBS_INTERVAL_HOURS) >= 1
      ? Number(process.env.DAILY_JOBS_INTERVAL_HOURS)
      : 24),
    runOnStart: process.env.DAILY_JOBS_RUN_ON_START !== "0",
  },
  {
    // Giai phong hang dang giu cho cua don thanh toan online qua han.
    name: "expire-unpaid-orders",
    file: "expireUnpaidOrders.js",
    envKey: "JOB_EXPIRE_UNPAID_ORDERS",
    everyMinutes: 5,
    runOnStart: true,
  },
  {
    // Luoi an toan khi webhook van chuyen bi lo: hoi trang thai van don dang di.
    name: "sync-shipments",
    file: "syncShipments.js",
    envKey: "JOB_SYNC_SHIPMENTS",
    everyMinutes: 30,
    runOnStart: false,
  },
  {
    // Quet review nghi van (trung noi dung, chung thiet bi, chu shop tu review).
    name: "fraud-review-scan",
    file: "scanSuspiciousReviews.js",
    envKey: "JOB_FRAUD_REVIEW_SCAN",
    everyMinutes: hours(24),
    runOnStart: false,
  },
];
