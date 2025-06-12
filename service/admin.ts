import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import type { AdminDoc } from "@/types/types";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

export const accountTokenGenerator = (account: AdminDoc): string => {
  return jwt.sign(
    {
      id: account._id,
      email: account.email,
      username: account.username,
      role: account.__t || "User",
      isAccepted: account.isAccepted || false,
    },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
};
