import crypto from "crypto";
import { Buffer } from "buffer";
import type { EncryptedBufferData, EncryptedData } from "@/types/types";

export const generateRandomIV = (): Buffer => {
  const iv = crypto.randomBytes(16);
  return iv;
};

export const generateSecretKey = (): Buffer => {
  const key = crypto.randomBytes(16); // 128 bits for AES-128, 32 bytes for AES-256
  return key;
};

export const generateB64SecretKey = (): string => {
  const secretKey = generateSecretKey();
  const b64SecretKey = secretKey.toString("base64");
  return b64SecretKey;
};

const decodeEncryptedDataToBuffer = (encryptedData: EncryptedData): EncryptedBufferData => {
  const ivBuffer = Buffer.from(encryptedData.iv, "base64");
  const cipherTextBuffer = Buffer.from(encryptedData.cipherText, "base64");
  return { ivBuffer, cipherTextBuffer };
};

const encodeEncryptedDataToBase64 = (encryptedData: EncryptedBufferData): EncryptedData => {
  const iv = encodeToBase64(encryptedData.ivBuffer);
  const cipherText = encodeToBase64(encryptedData.cipherTextBuffer);
  return { iv, cipherText };
};

export const generateB64IV = (): string => {
  const iv = generateRandomIV();
  const b64IV = iv.toString("base64");
  return b64IV;
};

export const encryptData = (plainText: Buffer, secretKey: Buffer, iv: Buffer): Buffer => {
  const cipher = crypto.createCipheriv("aes-128-cbc", secretKey, iv);
  const encrypted = Buffer.concat([cipher.update(plainText), cipher.final()]);
  return encrypted;
};

const encodeToBase64 = (buffer: Buffer): string => {
  return buffer.toString("base64");
};

export const encryptResponseData = (data: Object, b64SecretKey: string): EncryptedData | null => {
  try {
    const secretKey = Buffer.from(b64SecretKey, "base64");
    const iv = generateRandomIV();
    const plainText = Buffer.from(JSON.stringify(data));
    const cipherText = encryptData(plainText, secretKey, iv);
    const encryptedData: EncryptedBufferData = {
      ivBuffer: iv,
      cipherTextBuffer: cipherText,
    };
    const encryptedDataB64 = encodeEncryptedDataToBase64(encryptedData);
    return encryptedDataB64;
  } catch (error) {
    return null;
  }
};

export const decryptData = (cipherTextData: Buffer, secretKey: Buffer, iv: Buffer): Buffer => {
  const decipher = crypto.createDecipheriv("aes-128-cbc", secretKey, iv);
  const decrypted = Buffer.concat([decipher.update(cipherTextData), decipher.final()]);
  return decrypted;
};

export const decryptRequestData = (encryptedData: EncryptedData, b64SecretKey: string): Object | null => {
  try {
    const secretKey = Buffer.from(b64SecretKey, "base64");
    const { ivBuffer, cipherTextBuffer } = decodeEncryptedDataToBuffer(encryptedData);
    const data = decryptData(cipherTextBuffer, secretKey, ivBuffer);
    const dataString = data.toString("utf-8");
    const decryptedData = JSON.parse(dataString);
    return decryptedData;
  } catch (error) {
    console.error("Decryption failed:", error);
    return null;
  }
};
