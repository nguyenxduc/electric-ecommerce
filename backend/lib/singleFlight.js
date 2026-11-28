// Gop cac request giong het dang chay cung luc: chi mot lan tinh (query + JSON.stringify),
// cac request den trong luc do cho chung ket qua. Xong la xoa, khong giu lai nhu cache,
// nen gia/ton kho van moi theo tung dot request.
const inflight = new Map();

export const singleFlight = (key, fn) => {
  let pending = inflight.get(key);
  if (!pending) {
    pending = Promise.resolve()
      .then(fn)
      .finally(() => inflight.delete(key));
    inflight.set(key, pending);
  }
  return pending;
};
