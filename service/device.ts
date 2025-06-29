import crypto from "crypto";
import { Buffer } from "buffer";
import type { EncryptedData } from "@/types/types";

const generateRandomIV = (): Buffer => {
  const iv = crypto.randomBytes(16);
  return iv;
};

const generateSecretKey = (): Buffer => {
  const key = crypto.randomBytes(16); // 128 bits for AES-128, 32 bytes for AES-256
  return key;
};

export const generateB64SecretKey = (): string => {
  const secretKey = generateSecretKey();
  const b64SecretKey = secretKey.toString("base64");
  return b64SecretKey;
};

const encryptData = (data: object, secretKey: string): { iv: Buffer; cipher: Buffer } => {
  const iv = generateRandomIV();
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(secretKey, "hex"), iv);
  let encrypted = cipher.update(JSON.stringify(data), "utf-8", "hex");
  encrypted += cipher.final("hex");
  return { iv, cipher: Buffer.from(encrypted, "hex") };
};

const encodeToBase64 = (buffer: Buffer): string => {
  return buffer.toString("base64");
};

export const encryptResponseData = (data: Object, secretKey: string): EncryptedData => {
  try {
    const { iv, cipher } = encryptData(data, secretKey);
    const decodedIV = encodeToBase64(iv);
    const decodedCipher = encodeToBase64(cipher);
    const payload: EncryptedData = {
      iv: decodedIV,
      cipherText: decodedCipher,
    };
    return payload;
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("Encryption failed");
  }
};

const decryptData = (data: Object, secretKey: string, iv: Buffer): Object => {
  const decipher = crypto.createDecipheriv("aes-128-cbc", Buffer.from(secretKey, "hex"), iv);
  const dataStr = JSON.stringify(data);
  let decrypted = decipher.update(dataStr, "hex", "utf-8");
  decrypted += decipher.final("utf-8");
  return JSON.parse(decrypted);
};

export const decryptRequestData = (encryptedData: EncryptedData, secretKey: string): Object => {
  try {
    const iv = Buffer.from(encryptedData.iv, "base64");
    const cipherText = Buffer.from(encryptedData.cipherText, "base64");
    const data = { iv, cipherText };
    return decryptData(data, secretKey, iv);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Decryption failed");
  }
};
