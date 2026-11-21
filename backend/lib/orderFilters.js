// Bo loc chung cho danh sach don (admin + seller + xuat CSV + doanh thu seller):
// q tim theo ma don, nguoi mua (ten/email/sdt), nguoi nhan, ma van don, ten san
// pham; from/to loc ngay tao.
// shortcut: chi khong phan biet hoa/thuong, chua bo dau (can extension unaccent).
export const applyOrderListFilters = (where, { q, from, to } = {}) => {
  const term = typeof q === "string" ? q.trim().slice(0, 100) : "";
  if (term) {
    const has = { contains: term, mode: "insensitive" };
    where.OR = [
      { order_number: has },
      { receiver_name: has },
      { receiver_phone: has },
      { user: { name: has } },
      { user: { email: has } },
      { user: { phone: has } },
      { shipment: { tracking_code: has } },
      { order_items: { some: { product: { name: has } } } },
    ];
  }
  // Ngay YYYY-MM-DD hieu theo gio Viet Nam (+07:00), khong phai UTC: don dat
  // 00:00-07:00 sang khong bi tinh sang ngay hom truoc
  const DAY = /^\d{4}-\d{2}-\d{2}$/;
  const parseDay = (v) =>
    typeof v === "string" ? new Date(DAY.test(v) ? `${v}T00:00:00+07:00` : v) : null;
  const fromDate = parseDay(from);
  const toDate = parseDay(to);
  if (fromDate && !Number.isNaN(fromDate.getTime())) {
    where.created_at = { ...where.created_at, gte: fromDate };
  }
  if (toDate && !Number.isNaN(toDate.getTime())) {
    // "to" dang YYYY-MM-DD: lay het ngay do
    if (DAY.test(to)) toDate.setTime(toDate.getTime() + 24 * 60 * 60 * 1000);
    where.created_at = { ...where.created_at, lt: toDate };
  }
  return where;
};
