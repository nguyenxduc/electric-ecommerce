// Chay lai mot giao dich khi Postgres huy no vi xung dot dong thoi.
//
// Deadlock (40P01) hay xung dot tuan tu hoa (40001) khong phai loi nghiep vu:
// giao dich bi huy da rollback sach, chay lai tu dau la an toan va thuong
// thanh cong ngay. Prisma bao loai loi nay bang P2034, nhung khi loi phat ra
// giua mot cau lenh trong interactive transaction thi chi con ma Postgres nam
// trong message, nen kiem ca hai.

const CONFLICT_PG_CODES = /\b(40P01|40001)\b|deadlock detected/;

export const isTxConflict = (err) =>
  err?.code === "P2034" || CONFLICT_PG_CODES.test(String(err?.message || ""));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Goi `run()` (tra ve Promise cua prisma.$transaction), chay lai toi da
 * `attempts` lan neu bi huy vi xung dot. Loi khac (vd. het hang) nem ra ngay.
 * Het luot ma van xung dot thi nem loi cuoi cung de caller tra 409.
 */
export const withTxConflictRetry = async (run, { attempts = 3 } = {}) => {
  for (let i = 1; ; i++) {
    try {
      return await run();
    } catch (err) {
      if (!isTxConflict(err) || i >= attempts) throw err;
      // Gian cach ngau nhien de cac giao dich vua dung nhau khong lai dung tiep.
      await sleep(20 * i + Math.floor(Math.random() * 30));
    }
  }
};
