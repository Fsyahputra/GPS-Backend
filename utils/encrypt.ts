import crypto from "crypto";

const decrypt: Function = (encryptedText: string, key: string, iv: string): string => {
  const encryptedTextBuffer = Buffer.from(encryptedText, "base64");
  const keyBuffer = Buffer.from(key, "utf-8");
  const ivBuffer = Buffer.from(iv, "base64");
  const decipher = crypto.createDecipheriv("aes-128-cbc", keyBuffer, ivBuffer);
  let decrypted = Buffer.concat([decipher.update(encryptedTextBuffer), decipher.final()]);
  return decrypted.toString("utf8");
};

const encrypt: Function = (text: string, key: string, iv: string): string => {
  const textBuffer = Buffer.from(text, "utf-8");
  const keyBuffer = Buffer.from(key, "utf-8");
  const ivBuffer = Buffer.from(iv, "base64");
  const cipher = crypto.createCipheriv("aes-128-cbc", keyBuffer, ivBuffer);
  let encrypted = Buffer.concat([cipher.update(textBuffer), cipher.final()]);
  return encrypted.toString("base64");
};

const generateIV: Function = (): string => {
  return crypto.randomBytes(16).toString("base64");
};

const generateKey: Function = (): string => {
  return crypto.randomBytes(16).toString("base64");
};

const encryptObject = (obj: Object, key: string, iv: string): { IV: string; msg: string } => {
  const stringifiedObj = JSON.stringify(obj);
  const encryptedText = encrypt(stringifiedObj, key, iv);
  return {
    IV: iv,
    msg: encryptedText,
  };
};

export { decrypt, encrypt, generateIV, generateKey, encryptObject };
