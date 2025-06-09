import { ERROR_MESSAGES } from "@/constants";

export const isImageValid = (file: Express.Multer.File): string | null => {
  const validImageTypes = ["image/jpeg", "image/png", "image/gif"];
  if (!file || !file.mimetype || !validImageTypes.includes(file.mimetype)) {
    return ERROR_MESSAGES.FILE_TYPE_INVALID;
  }
  if (file.size > 5 * 1024 * 1024) {
    // 5MB limit
    return ERROR_MESSAGES.FILE_TOO_LARGE;
  }
  return null;
};
