import { prisma } from "../lib/db.js";

// Get or create chat for user
export const getOrCreateChat = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find existing open chat
    let chat = await prisma.chat.findFirst({
      where: {
        user_id: BigInt(userId),
        status: "open",
        deleted_at: null,
      },
      include: {
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
      orderBy: {
        updated_at: "desc",
      },
    });

    // Create new chat if doesn't exist
    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          user_id: BigInt(userId),
          status: "open",
        },
        include: {
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

    // Verify chat belongs to user (for customers) or allow admin
    const chat = await prisma.chat.findUnique({
      where: { id: BigInt(chatId) },
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: "Chat not found",
      });
    }

    // Check permission: user must own the chat OR be admin
    if (
      chat.user_id.toString() !== userId &&
      req.user.role !== "admin"
    ) {
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

    // Check permission
    if (
      chat.user_id.toString() !== userId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to view this chat",
      });
    }

    // Mark messages as read if admin viewing (mark messages from customers)
    if (req.user.role === "admin") {
      await prisma.message.updateMany({
        where: {
          chat_id: BigInt(chatId),
          is_read: false,
          sender_id: {
            not: BigInt(req.user.id), // Don't mark own messages
          },
          sender: {
            role: {
              not: "admin", // Only mark customer messages as read
            },
          },
        },
        data: {
          is_read: true,
        },
      });
    } else {
      // If customer viewing, mark admin messages as read
      await prisma.message.updateMany({
        where: {
          chat_id: BigInt(chatId),
          is_read: false,
          sender_id: {
            not: BigInt(req.user.id), // Don't mark own messages
          },
          sender: {
            role: "admin", // Mark admin messages as read
          },
        },
        data: {
          is_read: true,
        },
      });
    }

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

    const chat = await prisma.chat.findUnique({
      where: { id: BigInt(chatId) },
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: "Chat not found",
      });
    }

    // Check permission
    if (
      chat.user_id.toString() !== userId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        error: "Not authorized",
      });
    }

    // Mark messages as read (mark messages from other users, not own messages)
    const userRole = req.user.role;
    await prisma.message.updateMany({
      where: {
        chat_id: BigInt(chatId),
        is_read: false,
        sender_id: {
          not: BigInt(userId), // Don't mark own messages
        },
        sender: {
          ...(userRole === "admin"
            ? { role: { not: "admin" } } // Admin marks customer messages as read
            : { role: "admin" }), // Customer marks admin messages as read
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

