import jwt from "jsonwebtoken";
import { prisma } from "../lib/db.js";

/** Sets req.user when Bearer/cookie token is valid; otherwise continues without user. */
export const optionalAuth = async (req, res, next) => {
  try {
    let accessToken;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      accessToken = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.accessToken) {
      accessToken = req.cookies.accessToken;
    }

    if (!accessToken) {
      return next();
    }

    const secret =
      process.env.ACCESS_TOKEN_SECRET ||
      "your-access-token-secret-key-change-in-production";
    const decoded = jwt.verify(accessToken, secret);
    const userRecord = await prisma.user.findUnique({
      where: { id: BigInt(decoded.userId) },
    });

    if (userRecord) {
      req.user = {
        id: userRecord.id.toString(),
        name: userRecord.name,
        email: userRecord.email,
        role: userRecord.role,
        phone: userRecord.phone,
        address: userRecord.address,
      };
    }
    next();
  } catch {
    next();
  }
};
