import type { NextFunction, Response } from "express";
import { HttpError } from "@/utils/HttpError";
import { ERROR_MESSAGES } from "@/constants";
import User from "@/model/User";
import { startSession } from "mongoose";
import Root from "@/model/root";
import mongoose from "mongoose";
import Device from "@/model/device";
import type { AdmRootRequest, DeviceDoc } from "@/types/types";
import { findAdmin, findUser, isAdmin } from "@/middlewares/utils";
import { commandValidators } from "@/validator/validators";
import { handleValidators } from "./common";
import multer, { memoryStorage } from "multer";
import { isConfigFileValid } from "@/utils/fileUtils";
import { ConfigZodSchema } from "@/schema/config";
import Config from "@/model/config";

const storage = memoryStorage();
const uploadConfigFile = multer({ storage });

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
  const session = await startSession();
  session.startTransaction();
  try {
    const username = req.user?.username;
    if (!username) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    const user = await User.findOne({ username }).session(session);
    const deviceIDs = req.body.devices as string[] | undefined;
    if (!user) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    const { firstName, lastName, email } = req.body;
    const newUsername = req.body.username as string | undefined;
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;
    user.username = newUsername || user.username;

    let notFoundDevices: string[] = [];
    let notFoundDevicesLength: number = 0;
    let addedDevicesCount = 0;
    let foundDevices: string[] = [];
    let devices: DeviceDoc[] = [];

    if (deviceIDs && deviceIDs.length > 0) {
      devices = await Device.find({ deviceID: { $in: deviceIDs } }).session(session);
      foundDevices = devices.map((device) => device.deviceID);
      addedDevicesCount = devices.length;
      notFoundDevices = deviceIDs.filter((id) => !foundDevices.includes(id));
      notFoundDevicesLength = notFoundDevices.length;
    }

    if (addedDevicesCount > 0) {
      const existingDevices: string[] = user.devices.map((device) => device._id.toString());
      const newDevices: string[] = devices.map((device) => device._id.toString());
      const uniqueDevices: Set<string> = new Set([...existingDevices, ...newDevices]);
      const ArrayOfUniqueDevices: string[] = Array.from(uniqueDevices);
      const ArrayOfUniqueDevicesObjectIDs: mongoose.Types.ObjectId[] = ArrayOfUniqueDevices.map((id) => new mongoose.Types.ObjectId(id));
      user.devices = ArrayOfUniqueDevicesObjectIDs;
      await Device.updateMany({ _id: { $in: devices.map((device) => device._id) } }, { $set: { owner: user._id } }).session(session);
    }

    user.updatedAt = new Date();
    user.updatedBy = req.account?._id;
    await user.save({ session });
    await session.commitTransaction();
    session.endSession();
    res.status(200).json({
      message:
        `User updated successfully. ` +
        `${addedDevicesCount} device${addedDevicesCount !== 1 ? "s" : ""} added.` +
        (notFoundDevicesLength > 0 ? ` ${notFoundDevicesLength} device ID${notFoundDevicesLength !== 1 ? "s were" : " was"} not found: ${notFoundDevices.join(", ")}.` : " All provided device IDs were valid."),
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
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

export const deleteUserAccount = async (req: AdmRootRequest, res: Response, next: NextFunction) => {
  try {
    const user = findUser(req);
    const u = req.account?._id;
    if (!u) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    if (!user) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    const deletedUser = await User.findById(user._id);
    if (!deletedUser) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    deletedUser.isDeleted = true;
    deletedUser.deletedAt = new Date();
    deletedUser.deletedBy = u;
    deletedUser.updatedAt = new Date();
    await deletedUser.save();
    res.status(200).json({ message: "User account deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const deleteUserDevice = async (req: AdmRootRequest, res: Response, next: NextFunction) => {
  const session = await startSession();
  session.startTransaction();
  try {
    const { deviceID } = req.params;
    const user = findUser(req);
    const userDevices = req.devices;
    if (!user) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);

    const deviceToDelete = userDevices && userDevices.find((d) => d.deviceID === deviceID);
    if (!deviceToDelete) throw new HttpError(ERROR_MESSAGES.DEVICE_NOT_FOUND, 404);

    deviceToDelete.isDeleted = true;
    deviceToDelete.deletedAt = new Date();
    deviceToDelete.deletedBy = req.account?._id;
    deviceToDelete.updatedAt = new Date();
    deviceToDelete.updatedBy = req.account?._id;
    deviceToDelete.owner = null;
    const updatedUserDevices = userDevices.filter((d) => d.deviceID !== deviceID);
    const updatedUserDevicesIDs = updatedUserDevices.map((d) => d._id);
    user.devices = [...updatedUserDevicesIDs];
    user.updatedAt = new Date();
    user.updatedBy = req.account?._id;

    await user.save({ session });
    await deviceToDelete.save({ session });

    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: "Device deleted successfully" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const updateUserDevice = async (req: AdmRootRequest, res: Response, next: NextFunction) => {
  const session = await startSession();
  session.startTransaction();
  try {
    const { deviceID } = req.params;
    const user = findUser(req);
    if (!user) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    const device = req.devices && req.devices.find((d) => d.deviceID === deviceID);
    if (!device) throw new HttpError(ERROR_MESSAGES.DEVICE_NOT_FOUND, 404);

    device.name = req.body.name || device.name;
    device.updatedAt = new Date();
    device.updatedBy = req.account?._id;

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

export const validateCommand = [commandValidators(), handleValidators];

export const sendCommandToUserDevice = async (req: AdmRootRequest, res: Response, next: NextFunction) => {
  const session = await startSession();
  session.startTransaction();
  try {
    const { deviceID } = req.params;
    const user = findUser(req);
    if (!user) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    const device = req.devices && req.devices.find((d) => d.deviceID === deviceID);
    if (!device) throw new HttpError(ERROR_MESSAGES.DEVICE_NOT_FOUND, 404);
    const command = req.command;
    if (!command) throw new HttpError("Command is required", 400);
    device.commandHistory.push({
      command: command,
      timestamp: new Date(),
    });
    device.lastCommand = command;
    device.updatedAt = new Date();
    device.updatedBy = req.account?._id;
    await device.save({ session });
    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: "Command sent successfully", device });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const validateConfigFile = async (req: AdmRootRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new HttpError(ERROR_MESSAGES.NO_FILE_PROVIDED, 400);
    }
    const configMetadata = req.file;
    const error = isConfigFileValid(configMetadata);
    if (error) {
      throw new HttpError(error, 400);
    }

    const configFile = req.file.buffer.toString("utf-8");
    if (!configFile || configFile.trim() === "") {
      throw new HttpError(ERROR_MESSAGES.NO_FILE_PROVIDED, 400);
    }

    const configJson = JSON.parse(configFile);
    if (!configJson || typeof configJson !== "object") {
      throw new HttpError(ERROR_MESSAGES.INVALID_CONFIG_FILE, 400);
    }

    const validateConfSchema = ConfigZodSchema.safeParse(configJson);
    if (!validateConfSchema.success) {
      const errorMessage = validateConfSchema.error.errors.map((err) => err.message).join(", ");
      throw new HttpError(`Invalid configuration file: ${errorMessage}`, 400);
    }

    req.config = configJson;
    next();
  } catch (error) {
    next(error);
  }
};

export const updateConfig = async (req: AdmRootRequest, res: Response, next: NextFunction) => {
  const session = await startSession();
  session.startTransaction();
  try {
    const { deviceID } = req.params;
    const user = findUser(req);
    const configFile = req.config;

    if (!configFile) throw new HttpError(ERROR_MESSAGES.NO_FILE_PROVIDED, 400);

    const newConfig = new Config({
      espConfig: configFile.espConfig,
      initCommand: configFile.initCommand,
      gpsThreshold: configFile.gpsThreshold,
      networkConfig: configFile.networkConfig,
    });

    if (!user) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);

    const device = req.devices && req.devices.find((d) => d.deviceID === deviceID);

    if (!device) throw new HttpError(ERROR_MESSAGES.DEVICE_NOT_FOUND, 404);

    device.currentConfigId = newConfig._id;
    device.isNewConfig = true;
    device.configHistoryIds.push(newConfig._id);
    device.updatedAt = new Date();
    device.updatedBy = req.account?._id;

    await device.save({ session });
    await newConfig.save({ session });
    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: "Configuration updated successfully", device });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};
