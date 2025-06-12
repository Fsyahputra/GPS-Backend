import { ALLOWED_FILE_TYPES, ERROR_MESSAGES, MAX_FILE_SIZE } from "@/constants";

export const isImageValid = (file: Express.Multer.File): string | null => {
  const validImageTypes = ALLOWED_FILE_TYPES;
  if (!file || !file.mimetype || !validImageTypes.includes(file.mimetype)) {
    return ERROR_MESSAGES.FILE_TYPE_INVALID;
  }
  if (file.size > MAX_FILE_SIZE) {
    // 5MB limit
    return ERROR_MESSAGES.FILE_TOO_LARGE;
  }
  return null;
};
