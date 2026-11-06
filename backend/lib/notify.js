import { prisma } from "./db.js";
import { ROLES } from "../constants/roles.js";

// Programmatic notification writer, usable from any controller (shop
// approval, new order for seller, ...). user_id = null means broadcast.
// Mirrors the shape used by notification.controller.js::createNotification.
export async function notifyUser({ userId = null, title, message, type = "SYSTEM" }) {
  try {
    if (!title || !message) return null;
    return await prisma.notification.create({
      data: {
        title: String(title).trim(),
        message: String(message).trim(),
        type,
        user_id: userId ? BigInt(userId) : null,
      },
    });
  } catch (error) {
    // Notifications are best-effort; never let them break the main flow.
    console.error("notifyUser error:", error);
    return null;
  }
}

// Gui rieng tung admin, KHONG dung user_id = null: null la broadcast toi moi
// nguoi dung, ke ca nguoi mua.
export async function notifyAdmins({ title, message, type = "SYSTEM" }) {
  try {
    if (!title || !message) return 0;
    const admins = await prisma.user.findMany({
      where: { role: ROLES.ADMIN },
      select: { id: true },
    });
    if (admins.length === 0) return 0;
    const { count } = await prisma.notification.createMany({
      data: admins.map((a) => ({
        title: String(title).trim(),
        message: String(message).trim(),
        type,
        user_id: a.id,
      })),
    });
    return count;
  } catch (error) {
    console.error("notifyAdmins error:", error);
    return 0;
  }
}
