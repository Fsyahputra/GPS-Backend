import User from "@/model/User";
import type { Response, NextFunction } from "express";
import { HttpError } from "@/utils/HttpError";
import { startSession } from "mongoose";
import { ERROR_MESSAGES } from "@/constants";
import Device from "@/model/device";
import type { UserDoc, UserRequest } from "../types/types";
import ProfilePic from "@/model/profilePic";

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

export const registerDevice = async (req: UserRequest, res: Response, next: NextFunction) => {
  const session = await startSession();
  session.startTransaction();

  try {
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
