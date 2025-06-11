import rateLimit from "express-rate-limit";
import { BlacklistToken, DEFAULT_PROFILE_PIC, ProfilePic, type AccountDoc } from "./models";
import type { Request, Response, NextFunction } from "express";
import Account from "./models";
import type { AccountTokenPayload } from "./service";
import multer, { memoryStorage } from "multer";
import { accountTokenGenerator, verifyAccountToken, saveFileToDisk, isRoleValid, checkFieldExistence, deleteFileFromDisk } from "./service";
import { isImageValid } from "@/utils/fileUtils";
import path from "path";
import { updateAccountValidators, registerValidators, loginValidators, deviceNameValidator, type RequiredFields } from "./validators";
import { ERROR_MESSAGES } from "@/constants";
import { HttpError } from "@/utils/HttpError";
import { startSession } from "mongoose";
import Device, { type DeviceDoc } from "@/Device/deviceModels";
import type { UserDoc } from "./user/models";
import { validationResult } from "express-validator";

export const upload = multer({ storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
export const UPLOAD_DIR = path.resolve(__dirname, "uploads");

export interface AccountRequest extends Request {
  account?: AccountDoc;
  file?: Express.Multer.File;
  filepath?: string;
  decodedToken?: AccountTokenPayload;
  devices?: DeviceDoc[];
  existingAccount?: AccountDoc;
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

export const handleValidators = (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors
        .array()
        .map((err) => err.msg)
        .join(", ");
      throw new HttpError(`${errorMessages}`, 400);
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const authAccount = async (req: AccountRequest, res: Response, next: NextFunction) => {
  const { email, password, username } = req.body;
  let account: AccountDoc | null = null;
  try {
    if (!username) {
      account = await Account.findOne({ email: email });
    }

    if (!email) {
      account = await Account.findOne({ username: username });
    }

    if (username && email) {
      account = await Account.findOne({ $or: [{ email: email }, { username: username }] });
    }

    if (!account) {
      throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    }

    const isMatch = await account.comparePassword(password);

    if (!isMatch) throw new HttpError(ERROR_MESSAGES.INVALID_CREDENTIALS, 401);

    if (username && email) {
      if (account.username !== username) throw new HttpError(ERROR_MESSAGES.INVALID_CREDENTIALS, 401);
      if (account.email !== email) throw new HttpError(ERROR_MESSAGES.INVALID_CREDENTIALS, 401);
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

export const validateRegisterInput = [registerValidators(), handleValidators, validateAccountExists];

export const fieldAlreadyExist = (field: "username" | "email") => {
  return async (req: AccountRequest, res: Response, next: NextFunction) => {
    const value = field === "username" ? req.body.username : req.body.email;
    if (!value) throw new HttpError(ERROR_MESSAGES.FORBIDDEN, 403);

    try {
      const isExist = await checkFieldExistence(field, value);
      req.existingAccount = isExist === null ? undefined : isExist;
      next();
    } catch (error) {
      console.error(`Error checking if ${field} exists:`, error);
      next(error);
    }
  };
};

export const updateProfilePic = [upload.single("profilePic"), validateProfilePic, saveProfilePicToDisk, updateProfilePicDoc];

export const accountLogout = async (req: AccountRequest, res: Response, next: NextFunction) => {
  try {
    const decodedToken = req.decodedToken;
    if (!decodedToken || !decodedToken.id) {
      throw new HttpError(ERROR_MESSAGES.NO_TOKEN_PROVIDED, 401);
    }
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      throw new HttpError(ERROR_MESSAGES.NO_TOKEN_PROVIDED, 401);
    }
    const blacklistToken = new BlacklistToken({ token, userId: decodedToken.id });
    blacklistToken.expiresAt = new Date(Date.now() + 60 * 60 * 1000); // Token expires in 1 hour
    await blacklistToken.save();
    res.status(200).json({ message: "Account logged out successfully" });
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req: AccountRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.account;
    if (!user) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    await user.deleteOne();
    res.status(200).json({ message: "User account deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const updateDevice = async (req: AccountRequest, res: Response, next: NextFunction) => {
  const session = await startSession();
  session.startTransaction();
  try {
    const { deviceID } = req.params;
    const user = req.account;
    if (!user) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    const device = req.devices && req.devices.find((d) => d.deviceID === deviceID);
    if (!device) throw new HttpError(ERROR_MESSAGES.DEVICE_NOT_FOUND, 404);

    device.name = req.body.name || device.name;

    await device.save({ session });
    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: "Device updated successfully", device });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const getDevices = async (req: AccountRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.account;
    if (!user) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    const devices = await Device.find({ owner: user._id });
    req.devices = devices;
    next();
  } catch (error) {
    next(error);
  }
};

export const sendDevices = (req: AccountRequest, res: Response, next: NextFunction) => {
  try {
    const devices = req.devices;
    if (!devices) throw new HttpError(ERROR_MESSAGES.DEVICE_NOT_FOUND, 404);
    const payload = devices.map((d) => ({
      deviceID: d.deviceID,
      name: d.name,
      lastCommand: d.lastCommand,
      lastOnline: d.lastOnline,
    }));

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

export const deleteDevice = async (req: AccountRequest, res: Response, next: NextFunction) => {
  const session = await startSession();
  session.startTransaction();
  try {
    const { deviceID } = req.params;
    const user = req.account;
    if (!user) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    const device = req.devices && req.devices.find((d) => d.deviceID === deviceID);
    if (!device) throw new HttpError(ERROR_MESSAGES.DEVICE_NOT_FOUND, 404);

    await device.deleteOne({ session });
    if (user.__t !== "User") throw new HttpError(ERROR_MESSAGES.INVALID_CREDENTIALS, 404);

    const userDoc = user as UserDoc;
    userDoc.devices = userDoc.devices.filter((d) => d.toString() !== device._id.toString());
    await userDoc.save({ session });

    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: "Device deleted successfully" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const validateLoginInput = async (req: AccountRequest, res: Response, next: NextFunction) => {
  let requiredFields: RequiredFields = {
    username: true,
    email: true,
  };
  try {
    const { username, email, password } = req.body;

    if (!username && !email) throw new HttpError(ERROR_MESSAGES.INVALID_CREDENTIALS, 400);
    if (!username) requiredFields = { email: true };
    if (!email) requiredFields = { username: true };
    if (username && email) requiredFields = { username: true, email: true };
    if (username === "" || email === "") requiredFields = { username: true, email: true };

    const validator = loginValidators(requiredFields);

    for (const validation of validator) {
      await validation.run(req);
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const validateExistedAccount = (req: AccountRequest, res: Response, next: NextFunction) => {
  try {
    const account = req.account;
    if (!account) throw new HttpError(ERROR_MESSAGES.ACCOUNT_ALREADY_EXISTS, 400);
    const existingAccount = req.existingAccount;

    if (existingAccount && existingAccount._id.toString() !== account._id.toString()) {
      if (existingAccount.username === account.username) {
        throw new HttpError(ERROR_MESSAGES.USERNAME_ALREADY_EXISTS, 400);
      } else if (existingAccount.email === account.email) {
        throw new HttpError(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS, 400);
      } else {
        throw new HttpError(ERROR_MESSAGES.ACCOUNT_ALREADY_EXISTS, 400);
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const validateUpdateInput = [updateAccountValidators(), handleValidators, fieldAlreadyExist("username"), fieldAlreadyExist("email"), validateExistedAccount];

export const validateDeviceName = [deviceNameValidator(true, "body"), handleValidators];
