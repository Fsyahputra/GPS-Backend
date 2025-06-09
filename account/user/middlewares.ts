import User from "./models";
import type { AccountRequest } from "../middlewares";
import type { Response, NextFunction } from "express";
import { HttpError } from "@/utils/HttpError";
import { startSession } from "mongoose";
import { ERROR_MESSAGES } from "@/constants";
import type { UserDoc } from "./models";
import Device from "@/Device/deviceModels";
import validator from "express-validator";
import { BlacklistToken } from "../models";
import { ProfilePic } from "../models";

type UserRequest = Omit<AccountRequest, "account"> & {
  account?: UserDoc;
};

export const createAccount = async (req: UserRequest, res: Response, next: NextFunction) => {
  const session = await startSession();
  session.startTransaction();
  try {
    req.account = req.body as UserDoc;
    if (!req.account) throw new HttpError(ERROR_MESSAGES.INVALID_CREDENTIALS, 401);
    const user = req.account;
    if (!user) throw new HttpError(ERROR_MESSAGES.INVALID_CREDENTIALS, 401);
    const newUser = new User({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: user.password,
      roles: "User",
      username: user.username,
    });

    const profilePic = new ProfilePic({
      owner: newUser._id,
    });

    newUser.profilePic = profilePic._id;

    await newUser.save({ session });
    await profilePic.save({ session });
    await session.commitTransaction();
    await session.endSession();
    res.status(201).json({ message: "User account created successfully" });
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    next(error);
  }
};

export const sendUserAccount = async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.account;
    if (!user) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    res.status(200).json({
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserAccount = async (req: UserRequest, res: Response, next: NextFunction) => {
  const session = await startSession();
  session.startTransaction();
  try {
    const user = req.account;
    if (!user) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);

    const { firstName, lastName, email, password } = req.body;

    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;
    user.password = password || user.password;

    await user.save();
    res.status(200).json({
      message: "User account updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUserAccount = async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.account;
    if (!user) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    await user.deleteOne();
    res.status(200).json({ message: "User account deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const registerDevice = async (req: UserRequest, res: Response, next: NextFunction) => {
  const session = await startSession();
  try {
    session.startTransaction();

    const { deviceID } = req.params;
    const user = req.account;
    if (!deviceID) throw new HttpError(ERROR_MESSAGES.DEVICE_ID_REQUIRED, 400);
    if (!user) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    const device = await Device.findOne({ deviceID: deviceID }).session(session);
    if (!device) throw new HttpError(ERROR_MESSAGES.DEVICE_NOT_FOUND, 404);
    if (device.owner) throw new HttpError(ERROR_MESSAGES.DEVICE_ALREADY_REGISTERED, 400);
    const devicesCount = await Device.countDocuments({ owner: user._id }).session(session);
    device.name = `ESP Device ${devicesCount + 1}`;
    device.owner = user._id;
    device.deviceID = deviceID;

    await device.save({ session: session });
    user.devices.push(device._id);
    await user.save({ session: session });
    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: "Device registered successfully", device });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const getDevices = async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.account;
    if (!user) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    const devices = await Device.find({ owner: user._id });
    const payload = devices.map((device) => ({
      deviceID: device.deviceID,
      name: device.name,
      lastOnline: device.lastOnline,
      lastLocation: device.lastLocation,
    }));
    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

export const updateDevice = async (req: UserRequest, res: Response, next: NextFunction) => {
  const session = await startSession();
  session.startTransaction();
  try {
    const { deviceID } = req.params;
    const user = req.account;
    if (!user) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    const device = await Device.findOne({ deviceID: deviceID, owner: user._id });
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

export const deleteDevice = async (req: UserRequest, res: Response, next: NextFunction) => {
  const session = await startSession();
  session.startTransaction();
  try {
    const { deviceID } = req.params;
    const user = req.account;
    if (!user) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    const device = await Device.findOne({ deviceID: deviceID, owner: user._id });
    if (!device) throw new HttpError(ERROR_MESSAGES.DEVICE_NOT_FOUND, 404);

    await device.deleteOne({ session });
    user.devices = user.devices.filter((d) => d.toString() !== device._id.toString());
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: "Device deleted successfully" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const getDeviceById = async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const { deviceID } = req.params;
    const user = req.account;
    if (!user) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    const device = await Device.findOne({ deviceID: deviceID, owner: user._id });
    if (!device) throw new HttpError(ERROR_MESSAGES.DEVICE_NOT_FOUND, 404);
    res.status(200).json({
      deviceID: device.deviceID,
      name: device.name,
      lastOnline: device.lastOnline,
      lastLocation: device.lastLocation,
      softwareVersion: device.softwareVersion,
    });
  } catch (error) {
    next(error);
  }
};

export const deviceNameValidator = [
  validator.body("name").isString().withMessage("Device name must be a string").isLength({ min: 1, max: 50 }).withMessage("Device name must be between 1 and 50 characters"),
  (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validator.validationResult(req);
      if (!errors.isEmpty())
        throw new HttpError(
          errors
            .array()
            .map((err) => err.msg)
            .join(", "),
          400
        );
      next();
    } catch (error) {
      next(error);
    }
  },
];

export const userLogout = async (req: UserRequest, res: Response, next: NextFunction) => {
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
    res.status(200).json({ message: "User logged out successfully" });
  } catch (error) {
    next(error);
  }
};
