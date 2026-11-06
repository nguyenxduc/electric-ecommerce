// Trang thai vong doi cua cac thuc the chinh.
//
// Truoc day SHOP_STATUS nam trong shop.controller.js va bi 6 controller khac
// import nguoc lai - controller phu thuoc controller la huong phu thuoc sai.
// Con trang thai don hang thi khong co hang so nao, chi la chuoi roi rac khap
// noi. Gom het ve mot cho de doi chieu voi schema.prisma cho de.

export const SHOP_STATUS = Object.freeze({
  PENDING: "pending",
  ACTIVE: "active",
  REJECTED: "rejected",
  SUSPENDED: "suspended",
});

export const ORDER_STATUS = Object.freeze({
  PENDING: "pending",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  RETURNED: "returned",
});

// Cac buoc chuyen trang thai hop le. delivered/cancelled/returned la trang thai
// cuoi ("returned" chi den duoc qua luong yeu cau tra hang, khong phai do seller
// tu doi). Mang rong = khong di dau duoc nua.
export const ORDER_STATUS_FLOW = Object.freeze({
  [ORDER_STATUS.PENDING]: [
    ORDER_STATUS.PROCESSING,
    ORDER_STATUS.SHIPPED,
    ORDER_STATUS.DELIVERED,
    ORDER_STATUS.CANCELLED,
  ],
  [ORDER_STATUS.PROCESSING]: [
    ORDER_STATUS.SHIPPED,
    ORDER_STATUS.DELIVERED,
    ORDER_STATUS.CANCELLED,
  ],
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: [],
  [ORDER_STATUS.RETURNED]: [],
});

// Trang thai cuoi: khong the huy, khong the doi tiep.
export const FINAL_ORDER_STATUSES = Object.freeze([
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.RETURNED,
]);

// Chi nhung trang thai nay moi cho phep nguoi mua tu huy don.
export const BUYER_CANCELLABLE_STATUSES = Object.freeze([
  ORDER_STATUS.PENDING,
  ORDER_STATUS.PROCESSING,
]);

export const PAYMENT_STATUS = Object.freeze({
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  EXPIRED: "expired",
  CANCELED: "canceled",
});

export const RETURN_STATUS = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
});
