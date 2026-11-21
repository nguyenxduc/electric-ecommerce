// Xuat CSV an toan: boc moi o trong dau ngoac kep (chiu duoc dau phay, xuong
// dong, ngoac kep) va chong CSV injection - o bat dau bang = + - @ (hoac tab/CR)
// bi Excel hieu la cong thuc nen them ' phia truoc.
const cell = (v) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

// BOM de Excel doc dung UTF-8 (ten tieng Viet)
export const toCsv = (header, rows) =>
  "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
