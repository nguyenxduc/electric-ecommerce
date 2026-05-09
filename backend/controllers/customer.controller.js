import { prisma } from "../lib/db.js";
import { grantUpgradeVouchers, getTierByPoints } from "./loyalty.controller.js";

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
          loyalty_points: true,
          segment: true,
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
        loyalty_points: true,
        segment: true,
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
        loyalty_points: true,
        segment: true,
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

const TIER_MIN_POINTS = {
  BRONZE: 0,
  SILVER: 500,
  GOLD: 2000,
  PLATINUM: 5000,
};

export const updateCustomerTier = async (req, res) => {
  try {
    const id = BigInt(req.params.id);
    const nextTier = String(req.body?.segment || "").toUpperCase();
    if (!["BRONZE", "SILVER", "GOLD", "PLATINUM"].includes(nextTier)) {
      return res.status(400).json({ message: "Invalid tier segment" });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, loyalty_points: true },
    });
    if (!user) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const minPoints = TIER_MIN_POINTS[nextTier];
    const currentPoints = user.loyalty_points || 0;

    const updated = await prisma.$transaction(async (tx) => {
      const fromTier = user.segment || getTierByPoints(currentPoints).key;
      const nextPoints = currentPoints < minPoints ? minPoints : currentPoints;

      await grantUpgradeVouchers(tx, id, fromTier, nextTier);

      return tx.user.update({
        where: { id },
        data: {
          segment: nextTier,
          // Keep consistency: when set higher tier, points are lifted to tier floor.
          loyalty_points: nextPoints,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          address: true,
          loyalty_points: true,
          segment: true,
          created_at: true,
        },
      });
    });

    return res.json({ message: "Customer tier updated successfully", user: updated });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to update customer tier", error: error.message });
  }
};

export const updateCustomerPoints = async (req, res) => {
  try {
    const id = BigInt(req.params.id);
    const rawPoints = req.body?.loyalty_points;
    const nextPoints = Number.parseInt(rawPoints, 10);
    if (!Number.isInteger(nextPoints) || nextPoints < 0) {
      return res.status(400).json({ message: "Invalid loyalty points" });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, loyalty_points: true, segment: true },
    });
    if (!user) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const fromTier = user.segment || getTierByPoints(user.loyalty_points || 0).key;
    const toTier = getTierByPoints(nextPoints).key;

    const updated = await prisma.$transaction(async (tx) => {
      await grantUpgradeVouchers(tx, id, fromTier, toTier);
      return tx.user.update({
        where: { id },
        data: {
          loyalty_points: nextPoints,
          segment: toTier,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          address: true,
          loyalty_points: true,
          segment: true,
          created_at: true,
        },
      });
    });

    return res.json({ message: "Customer points updated successfully", user: updated });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to update customer points", error: error.message });
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
