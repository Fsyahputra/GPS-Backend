import type { NextFunction, Response } from "express";
import { HttpError } from "@/utils/HttpError";
import { ERROR_MESSAGES } from "@/constants";
import User from "@/model/User";
import { startSession } from "mongoose";
import Root from "@/model/root";
import mongoose from "mongoose";
import Device from "@/model/device";
import type { AdmRootRequest } from "@/types/types";
import { findAdmin, isAdmin } from "@/middlewares/utils";

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
    const admin = findAdmin(req);
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
    const admin = findAdmin(req);
    if (!admin) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);

    const { firstName, lastName, email, username } = req.body;
    if (!req.body || (!firstName && !lastName && !email && !username)) {
      throw new HttpError("No fields to update provided", 400);
    }
    admin.firstName = firstName || admin.firstName;
    admin.lastName = lastName || admin.lastName;
    admin.email = email || admin.email;
    admin.username = username || admin.username;
    admin.updatedAt = new Date();
    if (isAdmin(req.accountType)) {
      admin.updatedBy = admin._id;
    } else if (req.accountType === "Root") {
      admin.updatedBy = req.account?._id;
    }

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
    const admin = findAdmin(req);

    if (!admin) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);

    admin.isDeleted = true;
    admin.deletedAt = new Date();
    admin.updatedAt = new Date();

    const root = await Root.findOne({ username: process.env.ROOT_USERNAME });

    if (!root) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);

    root.AccReq = root.AccReq.filter((id) => id.toString() !== admin._id.toString());

    if (isAdmin(req.accountType)) {
      admin.updatedBy = admin._id;
      admin.deletedBy = admin._id;
    } else {
      admin.updatedBy = root._id;
      admin.deletedBy = root._id;
    }

    await root.save({ session });
    await admin.save({ session });
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
    user.updatedAt = new Date();
    user.updatedBy = req.account?._id;
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

export const getDevices = async (req: AdmRootRequest, res: Response, next: NextFunction) => {
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
