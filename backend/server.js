import express from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { prisma } from "./lib/db.js";
BigInt.prototype.toJSON = function () {
  return Number(this);
};
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.route.js";
import productRoutes from "./routes/product.route.js";
import cartRoutes from "./routes/cart.route.js";
import couponRoutes from "./routes/coupon.route.js";
import reviewRoutes from "./routes/review.route.js";
import orderRoutes from "./routes/order.route.js";
import customerRoutes from "./routes/customer.route.js";
import categoryRoutes from "./routes/category.route.js";
import subCategoryRoutes from "./routes/subCategory.route.js";
import wishlistRoutes from "./routes/wishlist.route.js";
import filterRoutes from "./routes/filter.route.js";
import paymentRoutes from "./routes/payment.route.js";
import settingRoutes from "./routes/setting.route.js";
import chatRoutes from "./routes/chat.route.js";
import dashboardRoutes from "./routes/dashboard.route.js";
import aiAssistantRoutes from "./routes/aiAssistant.route.js";
import recommendationRoutes from "./routes/recommendation.route.js";
import loyaltyRoutes from "./routes/loyalty.route.js";
import notificationRoutes from "./routes/notification.route.js";
import auditRoutes from "./routes/audit.route.js";
import behaviorRoutes from "./routes/behavior.route.js";

import cors from "cors";

const app = express();
dotenv.config();

const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = createServer(app);

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/sub-categories", subCategoryRoutes);
app.use("/api/filter", filterRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/ai-assistant", aiAssistantRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/loyalty", loyaltyRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/behavior", behaviorRoutes);

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// Socket.io authentication middleware
io.use(async (socket, next) => {
  try {
    // Try to get token from auth object first, then from headers
    let token = socket.handshake.auth?.token;

    if (!token) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader) {
        token = authHeader.replace("Bearer ", "");
      }
    }

    // Also try to get from cookies
    if (!token && socket.handshake.headers.cookie) {
      const cookies = socket.handshake.headers.cookie
        .split(";")
        .reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split("=");
          acc[key] = value;
          return acc;
        }, {});
      token = cookies.accessToken;
    }

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    const jwt = (await import("jsonwebtoken")).default;
    const secret =
      process.env.ACCESS_TOKEN_SECRET ||
      "your-access-token-secret-key-change-in-production";
    const decoded = jwt.verify(token, secret);

    const userId = decoded.userId?.toString() || decoded.id?.toString();
    if (!userId) {
      return next(new Error("Authentication error: Invalid token payload"));
    }

    // Get user from database to get role
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: { id: true, role: true },
    });

    if (!user) {
      return next(new Error("Authentication error: User not found"));
    }

    socket.userId = userId;
    socket.userRole = user.role || "user";
    next();
  } catch (error) {
    console.error("Socket auth error:", error);
    next(new Error("Authentication error: Invalid token"));
  }
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.userId} (${socket.userRole})`);

  // Join room for user's chat
  socket.join(`user_${socket.userId}`);

  // Join admin room if admin
  if (socket.userRole === "admin") {
    socket.join("admin_room");
  }

  // Handle sending message
  socket.on("send_message", async (data) => {
    try {
      const { chatId, content } = data;

      // Create message in database
      const message = await prisma.message.create({
        data: {
          chat_id: BigInt(chatId),
          sender_id: BigInt(socket.userId),
          content: content.trim(),
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              role: true,
              avatar: true,
            },
          },
          chat: {
            select: {
              user_id: true,
            },
          },
        },
      });

      // Update chat updated_at
      await prisma.chat.update({
        where: { id: BigInt(chatId) },
        data: { updated_at: new Date() },
      });

      // Emit to chat room (all participants in this chat)
      io.to(`chat_${chatId}`).emit("new_message", message);

      // If customer sent message, notify ALL admins
      if (socket.userRole !== "admin") {
        // Notify all admins in admin room
        io.to("admin_room").emit("new_chat_message", {
          chatId,
          message,
          chat: message.chat,
        });

        // Also emit a notification event for admin dashboard
        io.to("admin_room").emit("chat_notification", {
          chatId,
          userId: message.chat.user_id,
          message: {
            id: message.id,
            content: message.content,
            sender: message.sender,
            created_at: message.created_at,
          },
        });
      }

      // If admin sent message, notify the customer
      if (socket.userRole === "admin") {
        const chat = await prisma.chat.findUnique({
          where: { id: BigInt(chatId) },
          select: { user_id: true },
        });
        if (chat) {
          // Notify the specific customer
          io.to(`user_${chat.user_id}`).emit("new_chat_message", {
            chatId,
            message,
          });
        }
      }
    } catch (error) {
      console.error("Socket send message error:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  // Join chat room
  socket.on("join_chat", (chatId) => {
    socket.join(`chat_${chatId}`);
  });

  // Leave chat room
  socket.on("leave_chat", (chatId) => {
    socket.leave(`chat_${chatId}`);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.userId}`);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
