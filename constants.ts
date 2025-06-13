export const ERROR_MESSAGES = {
  ACCOUNT_NOT_FOUND: "Account not found",
  INVALID_CREDENTIALS: "Invalid email or password",
  NO_TOKEN_PROVIDED: "No token provided",
  INVALID_TOKEN: "Invalid token",
  FILE_REQUIRED: "Profile picture is required",
  FILE_TOO_LARGE: "File size exceeds 5MB limit",
  FILE_TYPE_INVALID: "Invalid file type. Only JPEG, PNG, and GIF are allowed.",
  INTERNAL_SERVER_ERROR: "Internal server error",
  TOO_MANY_REQUESTS: "Too many requests, please try again later",
  USERNAME_ALREADY_EXISTS: "Username already exists",
  FORBIDDEN: "Resource forbidden",
  EMAIL_ALREADY_EXISTS: "Email already exists",
  ACCOUNT_NOT_ACCEPTED: "Account not accepted",
  DEVICE_NOT_FOUND: "Device Not Found",
  DEVICE_ALREADY_REGISTERED: "Device already registered",
  ACCOUNT_ALREADY_EXISTS: "Account already exists",
  DEVICE_ID_REQUIRED: "Device ID is required",
  TOKEN_EXPIRED: "Token has expired",
  PROFILE_PICTURE_NOT_FOUND: "Profile picture not found",
  PROFILE_PICTURE_DELETION_FAILED: "Failed to delete profile picture",
  PROFILE_PICTURE_UPDATE_FAILED: "Failed to update profile picture",
  MASTER_KEY_EXISTS: "Master key already exists",
};

export const DEFAULT_PROFILE_PIC: string = "/home/muhammad-fadhil-syahputra/GPS/backend/uploads/default-profilepic.jpg";
export const MAX_FILE_SIZE: number = 5 * 1024 * 1024; // 5MB
export const ALLOWED_FILE_TYPES: string[] = ["image/jpeg", "image/png", "image/gif"];
export const TEST_IMAGE_PATH: string = "/home/muhammad-fadhil-syahputra/GPS/backend/test.jpeg";
