import type { NextFunction, Response } from "express";
import Admin from "@/model/admin";
import Root from "@/model/root";
import { startSession } from "mongoose";
import { HttpError } from "@/utils/HttpError";
import { DEFAULT_PROFILE_PIC, ERROR_MESSAGES } from "@/constants";
import { accountTokenGenerator } from "../service/admin";
import dotenv from "dotenv";
import type { AdminDoc, AdminRequest } from "../types/types";
import ProfilePic from "@/model/profilePic";
dotenv.config();

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
