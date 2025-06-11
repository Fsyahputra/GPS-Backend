import type { NextFunction, Request, Response } from "express";
import Admin from "./models";
import Root from "../root/rootModels";
import { mongo, startSession } from "mongoose";
import type { AdminDoc } from "./models";
import type { AccountRequest } from "../middlewares";
import { HttpError } from "@/utils/HttpError";
import { ERROR_MESSAGES } from "@/constants";
import { accountTokenGenerator } from "./service";
import dotenv from "dotenv";
import { DEFAULT_PROFILE_PIC, ProfilePic } from "../models";
import User, { type UserDoc } from "../user/models";
import Device, { type DeviceDoc } from "@/Device/deviceModels";
import mongoose from "mongoose";
import { verifyAccountToken } from "../service";
dotenv.config();

interface AdminRequest extends Omit<AccountRequest, "account"> {
  account?: AdminDoc;
  user?: UserDoc;
  devices?: DeviceDoc[];
}

export const createAdminAccount = async (req: AdminRequest, res: Response, next: NextFunction) => {
  const session = await startSession();
  session.startTransaction();
  try {
    const admin = req.body as AdminDoc;
    if (!admin) throw new HttpError(ERROR_MESSAGES.INVALID_CREDENTIALS, 404);
    const newAdmin = new Admin({
      username: admin.username,
      password: admin.password,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      roles: "Admin",
      isAccepted: false,
      profilePic: null,
    });

    const profilePic = new ProfilePic({
      owner: newAdmin._id,
      pathFile: DEFAULT_PROFILE_PIC,
    });

    newAdmin.profilePic = profilePic._id;

    const root = await Root.findOne({ username: process.env.ROOT_USERNAME }).session(session);
    if (!root) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);

    root.AccReq.push(newAdmin._id);
    await root.save({ session });
    await profilePic.save({ session });

    await newAdmin.save({ session });

    await session.commitTransaction();
    session.endSession();
    res.status(201).json({ message: "Admin account created successfully" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const validateAdmin = (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const admin = req.account;
    if (!admin) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    if (admin.roles === "Admin" && !admin.isAccepted) {
      throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_ACCEPTED, 403);
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const sendAdminAccount = async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const admin = req.account;
    if (!admin) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    res.status(200).json({
      username: admin.username,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      roles: admin.roles,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAdminAccount = async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const admin = req.account;
    if (!admin) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);

    const { firstName, lastName, email } = req.body;
    admin.firstName = firstName || admin.firstName;
    admin.lastName = lastName || admin.lastName;
    admin.email = email || admin.email;

    await admin.save();
    res.status(200).json({ message: "Admin account updated successfully", admin });
  } catch (error) {
    next(error);
  }
};

export const updateUserAccount = async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const username = req.user?.username;
    if (!username) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    const user = await User.findOne({ username }).populate("devices");
    const deviceIDs = req.body.devices as string[] | undefined;
    if (!user) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    const { firstName, lastName, email } = req.body;
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;

    let notFoundDevices: string[] = [];
    let notFoundDevicesLength: number = 0;
    let addedDevicesCount = 0;

    if (deviceIDs && deviceIDs.length > 0) {
      const objectIDs = deviceIDs.map((id) => new mongoose.Types.ObjectId(id));
      const devices = await Device.find({ _id: { $in: objectIDs } });
      const foundDeviceSet = new Set(devices.map((device) => device._id.toString()));
      addedDevicesCount = devices.length;
      notFoundDevices = deviceIDs.filter((id) => !foundDeviceSet.has(id));
      notFoundDevicesLength = notFoundDevices.length;
    }

    await user.save();
    res.status(200).json({
      message:
        `User updated successfully. ` +
        `${addedDevicesCount} device${addedDevicesCount !== 1 ? "s" : ""} added.` +
        (notFoundDevicesLength > 0 ? ` ${notFoundDevicesLength} device ID${notFoundDevicesLength !== 1 ? "s were" : " was"} not found: ${notFoundDevices.join(", ")}.` : " All provided device IDs were valid."),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAdminAccount = async (req: AdminRequest, res: Response, next: NextFunction) => {
  const session = await startSession();
  session.startTransaction();

  try {
    const admin = req.account;

    if (!admin) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);

    await admin.deleteOne({ session });
    const root = await Root.findOne({ username: process.env.ROOT_USERNAME });
    if (!root) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    root.AccReq = root.AccReq.filter((id) => id.toString() !== admin._id.toString());
    await root.save({ session });

    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: "Admin account deleted successfully" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const generateAdminToken = (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const admin = req.account;
    if (!admin) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);

    const token = accountTokenGenerator(admin);
    const decodedToken = verifyAccountToken(token);
    res.status(200).json({ token });
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const username = req.params.username;
    const user = await User.findOne({ username }).populate("devices");
    if (!user) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const sendUserAccount = async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    res.status(200).json({
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      devices: user.devices,
    });
  } catch (error) {
    next(error);
  }
};

export const getDevices = async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    const devices = await Device.find({ owner: user._id });
    req.devices = devices;
    next();
  } catch (error) {
    next(error);
  }
};
