import jwt from "jsonwebtoken";
import { prisma } from "../lib/db.js";

export const protectRoute = async (req, res, next) => {
  try {
    let accessToken;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      accessToken = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.accessToken) {
      accessToken = req.cookies.accessToken;
    }

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized - No access token provided",
      });
    }

    try {
      const secret =
        process.env.ACCESS_TOKEN_SECRET ||
        "your-access-token-secret-key-change-in-production";
      const decoded = jwt.verify(accessToken, secret);
      const userRecord = await prisma.user.findUnique({
        where: { id: BigInt(decoded.userId) },
      });

      if (!userRecord) {
        return res.status(401).json({
          success: false,
          error: "User not found",
        });
      }

      req.user = {
        id: userRecord.id.toString(),
        name: userRecord.name,
        email: userRecord.email,
        role: userRecord.role,
        phone: userRecord.phone,
        address: userRecord.address,
      };
      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          error: "Unauthorized - Access token expired",
        });
      }
      throw error;
    }
  } catch (error) {
    console.error("Error in protectRoute middleware:", error.message);
    return res.status(401).json({
      success: false,
      error: "Unauthorized - Invalid access token",
    });
  }
};

export const adminRoute = (req, res, next) => {
  // if (req.user && req.user.role === "admin") {
  //   next();
  // } else {
  //   return res.status(403).json({
  //     success: false,
  //     error: "Access denied - Admin only",
  //   });
  // }

  next();
};
