import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import type { AccountDoc } from "./models";
import dotenv from "dotenv";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { HttpError } from "@/utils/HttpError";
import Account from "./models";
import { ERROR_MESSAGES } from "@/constants";
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

export interface AccountTokenPayload {
  id: string;
  email: string;
  username: string;
  role: string;
  isAccepted?: boolean;
  exp?: number;
  iat?: number;
}

export const accountTokenGenerator = (account: AccountDoc): string => {
  return jwt.sign(
    {
      id: account._id,
      email: account.email,
      username: account.username,
      role: account.__t || "User",
    },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
};

export const verifyAccountToken = (token: string): string | JwtPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
};

export const imageProcessor = async (imgBuff: Buffer, filePath: string): Promise<void> => {
  try {
    await sharp(imgBuff).resize(800).toFormat("jpeg", { quality: 60 }).toFile(filePath);
  } catch (error) {
    console.error("Error processing image:", error);
    throw new Error("Image processing failed");
  }
};

export const saveFileToDisk = async (file: Express.Multer.File, dir: string, username: string): Promise<string> => {
  const filename = "profilePic_" + Date.now() + "_" + username + path.extname(file.originalname);
  const filePath = path.join(dir, filename);
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await imageProcessor(file.buffer, filePath);
    return filePath;
  } catch (error) {
    console.error("Error saving file to disk:", error);
    throw new Error("File saving failed");
  }
};

export const deleteFileFromDisk = async (filePath: string): Promise<boolean> => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
};

export const isRoleValid = (role: string, validRoles: string[]): boolean => {
  return validRoles.includes(role);
};

export const checkFieldExistence = async (field: "username" | "email", value: string): Promise<AccountDoc | null> => {
  try {
    const isExist = await Account.findOne({ [field]: value });
    return isExist;
  } catch (error) {
    throw error;
  }
};
