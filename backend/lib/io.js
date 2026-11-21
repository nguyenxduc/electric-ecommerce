// Giu tham chieu Socket.IO server cho controller can day/ngat ket noi
// (server.js goi setIO sau khi tao). null khi chay ngoai server (test, job).
let io = null;
export const setIO = (instance) => {
  io = instance;
};
export const getIO = () => io;
