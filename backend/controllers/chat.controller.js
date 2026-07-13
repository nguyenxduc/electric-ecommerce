import { prisma } from "../lib/db.js";
import { SHOP_STATUS } from "./shop.controller.js";

const chatMessagesInclude = {
  messages: {
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          role: true,
          avatar: true,
        },
      },
    },
    orderBy: {
      created_at: "asc",
    },
  },
  shop: { select: { id: true, name: true, slug: true, logo_url: true } },
};

// Loads a chat together with the owning shop's owner_id for permission checks
const loadChatForAuth = (chatId) =>
  prisma.chat.findUnique({
    where: { id: BigInt(chatId) },
    include: { shop: { select: { owner_id: true } } },
  });

// The buyer, the platform admin (support chats), or the shop owner (shop chats)
const canAccessChat = (chat, user) => {
  if (chat.user_id.toString() === user.id) return true;
  if (!chat.shop_id) return user.role === "admin";
  return (
    user.role === "admin" ||
    chat.shop?.owner_id?.toString() === user.id
  );
};

// Get or create chat for user. ?shop_id= opens a chat with that shop;
// without it, the classic platform-support chat is used.
export const getOrCreateChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const shopIdRaw = req.query.shop_id;
    let shopId = null;

    if (shopIdRaw) {
      const shop = await prisma.shop.findFirst({
        where: {
          id: BigInt(shopIdRaw),
          status: SHOP_STATUS.ACTIVE,
          deleted_at: null,
        },
        select: { id: true },
      });
      if (!shop) {
        return res
          .status(404)
          .json({ success: false, error: "Shop not found" });
      }
      shopId = shop.id;
    }

    // Find existing open chat
    let chat = await prisma.chat.findFirst({
      where: {
        user_id: BigInt(userId),
        shop_id: shopId,
        status: "open",
        deleted_at: null,
      },
      include: chatMessagesInclude,
      orderBy: {
        updated_at: "desc",
      },
    });

    // Create new chat if doesn't exist
    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          user_id: BigInt(userId),
          shop_id: shopId,
          status: "open",
        },
        include: chatMessagesInclude,
      });
    }

    res.json({
      success: true,
      data: chat,
    });
  } catch (error) {
    console.error("Get or create chat error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get or create chat",
      details: error.message,
    });
  }
};

// Send message
export const sendMessage = async (req, res) => {
  try {
    const { chatId, content } = req.body;
    const userId = req.user.id;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: "Message content is required",
      });
    }

    // Verify chat belongs to user, the shop owner (shop chats), or admin
    const chat = await loadChatForAuth(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: "Chat not found",
      });
    }

    if (!canAccessChat(chat, req.user)) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to send message in this chat",
      });
    }

    const message = await prisma.message.create({
      data: {
        chat_id: BigInt(chatId),
        sender_id: BigInt(userId),
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
      },
    });

    // Update chat updated_at
    await prisma.chat.update({
      where: { id: BigInt(chatId) },
      data: { updated_at: new Date() },
    });

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: message,
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send message",
      details: error.message,
    });
  }
};

// Get all chats (admin only)
export const getAllChats = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where = {
      deleted_at: null,
      // Admin inbox = platform support chats; seller inbox = own shop's chats
      shop_id: req.shop ? req.shop.id : null,
      ...(status && { status }),
    };

    const [chats, total] = await Promise.all([
      prisma.chat.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          messages: {
            take: 1,
            orderBy: {
              created_at: "desc",
            },
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                },
              },
            },
          },
        },
        orderBy: {
          updated_at: "desc",
        },
        skip,
        take,
      }),
      prisma.chat.count({ where }),
    ]);

    // Get unread counts for each chat (messages from customers that admin hasn't read)
    const chatsWithUnread = await Promise.all(
      chats.map(async (chat) => {
        const unreadCount = await prisma.message.count({
          where: {
            chat_id: chat.id,
            is_read: false,
            sender_id: {
              not: BigInt(req.user.id), // Don't count own messages
            },
            sender: {
              role: {
                not: "admin", // Only count messages from customers
              },
            },
          },
        });
        return {
          ...chat,
          unreadCount,
        };
      })
    );

    res.json({
      success: true,
      data: {
        chats: chatsWithUnread,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Get all chats error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get chats",
      details: error.message,
    });
  }
};

// Get chat by ID
export const getChatById = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const chat = await prisma.chat.findUnique({
      where: { id: BigInt(chatId) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        shop: { select: { id: true, name: true, slug: true, owner_id: true } },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                role: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            created_at: "asc",
          },
        },
      },
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: "Chat not found",
      });
    }

    if (!canAccessChat(chat, req.user)) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to view this chat",
      });
    }

    // Viewing marks the other party's messages as read (a chat only ever has
    // two parties: the buyer and either the platform admin or the shop owner).
    await prisma.message.updateMany({
      where: {
        chat_id: BigInt(chatId),
        is_read: false,
        sender_id: {
          not: BigInt(userId),
        },
      },
      data: {
        is_read: true,
      },
    });

    res.json({
      success: true,
      data: chat,
    });
  } catch (error) {
    console.error("Get chat by ID error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get chat",
      details: error.message,
    });
  }
};

// Update chat status (admin only)
export const updateChatStatus = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { status } = req.body;

    if (!["open", "closed", "resolved"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status. Must be: open, closed, or resolved",
      });
    }

    const chat = await prisma.chat.update({
      where: { id: BigInt(chatId) },
      data: { status },
    });

    res.json({
      success: true,
      message: "Chat status updated successfully",
      data: chat,
    });
  } catch (error) {
    console.error("Update chat status error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update chat status",
      details: error.message,
    });
  }
};

// Mark messages as read
export const markMessagesAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const chat = await loadChatForAuth(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: "Chat not found",
      });
    }

    if (!canAccessChat(chat, req.user)) {
      return res.status(403).json({
        success: false,
        error: "Not authorized",
      });
    }

    // Mark the other party's messages as read (chats have exactly two parties)
    await prisma.message.updateMany({
      where: {
        chat_id: BigInt(chatId),
        is_read: false,
        sender_id: {
          not: BigInt(userId), // Don't mark own messages
        },
      },
      data: {
        is_read: true,
      },
    });

    res.json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error) {
    console.error("Mark messages as read error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to mark messages as read",
      details: error.message,
    });
  }
};

