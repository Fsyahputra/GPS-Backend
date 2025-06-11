import type { NextFunction, Response } from "express";
import { HttpError } from "@/utils/HttpError";
import { ERROR_MESSAGES } from "@/constants";
import Admin from "../admin/models";
import type { RootRequest } from "./root";
import type { AdminRequest } from "./admin";
import User from "../user/models";
import { startSession } from "mongoose";
import Root from "../root/rootModels";
import mongoose from "mongoose";

type AdmRootRequest = RootRequest & AdminRequest;

export const getAdmin = async (req: AdmRootRequest, res: Response, next: NextFunction) => {
  try {
    const adminUsername = req.params.username;
    const admin = await Admin.findOne({ username: adminUsername });
    if (!admin) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    req.admin = admin;
    next();
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req: AdmRootRequest, res: Response, next: NextFunction) => {
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

export const sendAdminAccount = async (req: AdmRootRequest, res: Response, next: NextFunction) => {
  try {
    const admin = req.account;
    if (!admin) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    res.status(200).json({
      username: admin.username,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      roles: admin.roles,
      isAccepted: admin.isAccepted,
    });
  } catch (error) {
    next(error);
  }
};

export const sendUserAccount = async (req: AdmRootRequest, res: Response, next: NextFunction) => {
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

export const updateAdminAccount = async (req: AdmRootRequest, res: Response, next: NextFunction) => {
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

export const deleteAdminAccount = async (req: AdmRootRequest, res: Response, next: NextFunction) => {
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

export const updateUserAccount = async (req: AdmRootRequest, res: Response, next: NextFunction) => {
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
