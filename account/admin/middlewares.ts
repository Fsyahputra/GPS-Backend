import type { NextFunction, Request, Response } from "express";
import Admin from "./models";
import Root from "../root/rootModels";
import { startSession } from "mongoose";
import type { AdminDoc } from "./models";
import type { AccountRequest } from "../middlewares";
import { HttpError } from "@/utils/HttpError";
import { ERROR_MESSAGES } from "@/constants";
import { accountTokenGenerator } from "./service";
import dotenv from "dotenv";
dotenv.config();

interface AdminRequest extends Omit<AccountRequest, "account"> {
  account?: AdminDoc;
}

export const createAdminAccount = async (req: AdminRequest, res: Response, next: NextFunction) => {
  const session = await startSession();
  session.startTransaction();
  try {
    const admin = req.account;
    if (!admin) throw new HttpError(ERROR_MESSAGES.INVALID_CREDENTIALS, 404);
    const newAdmin = new Admin({
      username: admin.username,
      password: admin.password,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      roles: admin.roles,
      isAccepted: false,
    });
    const root = await Root.findOne({ username: process.env.ROOT_USERNAME });
    if (!root) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    root.AccReq.push(newAdmin._id);
    await root.save();
    await newAdmin.save();
    await session.commitTransaction();
    session.endSession();
    res.status(201).json("Admin account created successfully");
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
    res.status(200).json({ token });
  } catch (error) {
    next(error);
  }
};
