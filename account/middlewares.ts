import rateLimit from "express-rate-limit";
import { BlacklistToken, DEFAULT_PROFILE_PIC, ProfilePic, type AccountDoc } from "./models";
import type { Request, Response, NextFunction } from "express";
import Account from "./models";
import type { AccountTokenPayload } from "./service";
import multer, { memoryStorage } from "multer";
import { accountTokenGenerator, verifyAccountToken, saveFileToDisk, isRoleValid, checkFieldExistence, deleteFileFromDisk } from "./service";
import { isImageValid } from "@/utils/fileUtils";
import path from "path";
import { usernameValidator, firstNameValidator, emailValidator, isStrongPassword, isValidEmail, handleValidators, lastNameValidator, passwordValidator } from "./validators";
import { ERROR_MESSAGES } from "@/constants";
import { HttpError } from "@/utils/HttpError";
import { startSession } from "mongoose";

export const upload = multer({ storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
export const UPLOAD_DIR = path.resolve(__dirname, "uploads");

export interface AccountRequest extends Request {
  account?: AccountDoc;
  file?: Express.Multer.File;
  filepath?: string;
  decodedToken?: AccountTokenPayload;
}

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100000000, // 1 million requests
  message: ERROR_MESSAGES.TOO_MANY_REQUESTS,
});

export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000000000,
  message: ERROR_MESSAGES.TOO_MANY_REQUESTS,
});

export const authAccount = async (req: AccountRequest, res: Response, next: NextFunction) => {
  const { email, password, username } = req.body;
  try {
    const account = await Account.findOne({ $or: [{ email: email }, { username: username }] });
    if (!account) {
      throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    }
    const isMatch = await account.comparePassword(password);
    if (!isMatch) {
      throw new HttpError(ERROR_MESSAGES.INVALID_CREDENTIALS, 401);
    }
    req.account = account;
    next();
  } catch (error) {
    next(error);
  }
};

export const generateToken = (req: AccountRequest, res: Response) => {
  const account = req.account;

  if (!account) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
  const token = accountTokenGenerator(account);
  res.status(200).json({ token });
};

export const validateToken = async (req: AccountRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    if (!token) throw new HttpError(ERROR_MESSAGES.NO_TOKEN_PROVIDED, 401);
    const isBlacklisted = await BlacklistToken.findOne({ token });
    if (isBlacklisted) throw new HttpError(ERROR_MESSAGES.TOKEN_EXPIRED, 401);
    const decoded = verifyAccountToken(token) as AccountTokenPayload;
    if (!decoded) throw new HttpError(ERROR_MESSAGES.INVALID_TOKEN, 401);
    const account = await Account.findById(decoded.id);
    if (!account) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    req.account = account;
    req.decodedToken = decoded;
    next();
  } catch (error) {
    next(error);
  }
};

export const validateAccountExists = async (req: Request, res: Response, next: NextFunction) => {
  const { username } = req.body;
  const { email } = req.body;
  try {
    const existing = await Account.findOne({
      $or: [{ username: username }, { email: email }],
    });
    if (existing) {
      throw new HttpError(ERROR_MESSAGES.ACCOUNT_ALREADY_EXISTS, 400);
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const validateProfilePic = (req: AccountRequest, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    if (!file) throw new HttpError(ERROR_MESSAGES.FILE_REQUIRED, 400);

    const errorMsg = isImageValid(file);
    if (errorMsg) throw new HttpError(errorMsg, 400);

    next();
  } catch (error) {
    next(error);
  }
};

export const deleteProfilePic = async (req: AccountRequest, res: Response, next: NextFunction) => {
  try {
    const account = req.account;

    if (!account) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);

    if (!account.profilePic) throw new HttpError(ERROR_MESSAGES.PROFILE_PICTURE_NOT_FOUND, 404);

    const profilePic = await ProfilePic.findById(account.profilePic);

    if (!profilePic) throw new HttpError(ERROR_MESSAGES.PROFILE_PICTURE_NOT_FOUND, 404);

    const oldProfilePicPath = profilePic.pathFile;

    if (oldProfilePicPath === DEFAULT_PROFILE_PIC) throw new HttpError(ERROR_MESSAGES.PROFILE_PICTURE_DELETION_FAILED, 400);

    if (!oldProfilePicPath) throw new HttpError(ERROR_MESSAGES.PROFILE_PICTURE_NOT_FOUND, 500);

    const isDeleted = await deleteFileFromDisk(oldProfilePicPath);

    if (!isDeleted) throw new HttpError(ERROR_MESSAGES.PROFILE_PICTURE_DELETION_FAILED, 500);

    profilePic.pathFile = DEFAULT_PROFILE_PIC;
    await profilePic.save();

    res.status(200).json({ message: "Profile picture deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const saveProfilePicToDisk = async (req: AccountRequest, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    if (!file) throw new HttpError(ERROR_MESSAGES.FILE_REQUIRED, 400);

    const uploadDir = UPLOAD_DIR;
    const username = req.account?.username || "default_user";
    req.filepath = await saveFileToDisk(file, uploadDir, username);
    next();
  } catch (error) {
    next(error);
  }
};

export const updateProfilePicDoc = async (req: AccountRequest, res: Response, next: NextFunction) => {
  const session = await startSession();
  session.startTransaction();
  try {
    const filePath = req.filepath;
    const account = req.account;

    if (!filePath) throw new HttpError(ERROR_MESSAGES.FILE_REQUIRED, 400);

    if (!account) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);

    const profilePicDoc = await ProfilePic.findOne({ owner: account._id });

    if (!profilePicDoc) throw new HttpError("Internal Server Error", 500);

    profilePicDoc.pathFile = filePath;
    await profilePicDoc.save({ session });
    account.profilePic = profilePicDoc._id;
    await account.save({ session });
    await session.commitTransaction();
    await session.endSession();
    res.status(201).json({ message: "Profile picture uploaded successfully" });
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    next(error);
  }
};

export const validateRole = (requiredRoles: Array<"Admin" | "User" | "Root">) => {
  return (req: AccountRequest, res: Response, next: NextFunction) => {
    try {
      const account = req.account;
      if (!account) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);

      const role = account.roles || "User";
      if (!isRoleValid(role, requiredRoles)) throw new HttpError(ERROR_MESSAGES.FORBIDDEN, 403);
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const validateRegisterInput = [usernameValidator(), emailValidator(), passwordValidator(), firstNameValidator(), lastNameValidator(), handleValidators, validateAccountExists];

export const getUser = async (req: AccountRequest, res: Response, next: NextFunction) => {
  try {
    const accountUserName = req.params.username;
    if (!accountUserName) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    const account = await Account.findOne({ username: accountUserName });
    if (!account) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);

    req.account = account;
    next();
  } catch (error) {
    next(error);
  }
};

export const fieldAlreadyExist = (field: "username" | "email") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const value = field === "username" ? req.body.username : req.body.email;
    if (!value) throw new HttpError(ERROR_MESSAGES.FORBIDDEN, 403);

    try {
      const isExist = await checkFieldExistence(field, value);
      if (isExist) {
        if (field === "username") {
          throw new HttpError(ERROR_MESSAGES.USERNAME_ALREADY_EXISTS, 400);
        } else if (field === "email") {
          throw new HttpError(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS, 400);
        }
      }
      next();
    } catch (error) {
      console.error(`Error checking if ${field} exists:`, error);
      next(error);
    }
  };
};

export const updateAccountValidators = [
  usernameValidator(false),
  emailValidator(false),
  passwordValidator(false),
  firstNameValidator(false),
  lastNameValidator(false),
  handleValidators,
  fieldAlreadyExist("username"),
  fieldAlreadyExist("email"),
];

export const updateProfilePic = [upload.single("profilePic"), validateProfilePic, saveProfilePicToDisk, updateProfilePicDoc];
