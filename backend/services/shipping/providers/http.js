// Goi HTTP toi don vi van chuyen: moi loi mang/HTTP/JSON deu thanh AppError 502
// de controller tra thong bao ro rang thay vi sap request.
import { AppError } from "../../../middleware/error.middleware.js";

export const callCarrier = async (carrier, url, { method = "GET", headers = {}, body } = {}) => {
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", ...headers },
      ...(body !== undefined && { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    throw new AppError(`${carrier}: khong ket noi duoc (${err.message})`, 502);
  }
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // body khong phai JSON (vd HTML loi) -> bao loi o duoi
  }
  if (!res.ok || !json) {
    const msg = json?.code_message_value || json?.message || text.slice(0, 120);
    throw new AppError(`${carrier}: ${res.status} ${msg}`, 502);
  }
  return json;
};

// Bo dau + ha chu thuong de so khop ten tinh/huyen
export const norm = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/^(thanh pho|tinh|quan|huyen|thi xa|phuong|xa|tp\.?)\s+/, "")
    .trim();
