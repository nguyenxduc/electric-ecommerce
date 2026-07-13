import { prisma } from "./db.js";

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
