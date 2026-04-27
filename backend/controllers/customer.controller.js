import { prisma } from "../lib/db.js";

export const listCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 20, q } = req.query;
    const where = { deleted_at: null };
    if (q) {
      where.OR = [
        { name: { contains: String(q), mode: "insensitive" } },
        { email: { contains: String(q), mode: "insensitive" } },
        { phone: { contains: String(q), mode: "insensitive" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          address: true,
          created_at: true,
        },
        skip,
        take,
      }),
    ]);

    res.json({
      users,
      pagination: {
        current_page: Number(page),
        per_page: Number(limit),
        total_count: total,
        total_pages: Math.max(1, Math.ceil(total / Number(limit))),
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to list customers", error: error.message });
  }
};

export const getCustomer = async (req, res) => {
  try {
    const id = BigInt(req.params.id);
    const user = await prisma.user.findFirst({
      where: { id, deleted_at: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        address: true,
        created_at: true,
      },
    });
    if (!user) return res.status(404).json({ message: "Customer not found" });
    res.json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get customer", error: error.message });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const id = BigInt(req.params.id);
    const { name, role, phone, address } = req.body;
    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: name ?? undefined,
        role: role ?? undefined,
        phone: phone ?? undefined,
        address: address ?? undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        address: true,
        created_at: true,
      },
    });
    res.json({ message: "Customer updated successfully", user: updated });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update customer", error: error.message });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const id = BigInt(req.params.id);
    await prisma.user.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
    res.json({ message: "Customer deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete customer", error: error.message });
  }
};
