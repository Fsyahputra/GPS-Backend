import Root from "@/model/root";
import type { NextFunction, Response } from "express";
import { HttpError } from "@/utils/HttpError";
import { DEFAULT_PROFILE_PIC, ERROR_MESSAGES } from "@/constants";
import { startSession } from "mongoose";
import Admin from "@/model/admin";
import type { RootRequest } from "../types/types";
import ProfilePic from "@/model/profilePic";
import { isMasterKeyExists } from "@/service/root";

export const createRootAccount = async (req: RootRequest, res: Response, next: NextFunction) => {
  const session = await startSession();
  session.startTransaction();

  try {
    const root = req.body;
    if (!root) throw new HttpError(ERROR_MESSAGES.INVALID_CREDENTIALS, 404);

    const newRoot = new Root({
      username: root.username,
      password: root.password,
      email: root.email,
      firstName: root.firstName,
      lastName: root.lastName,
      roles: "Root",
      masterkey: root.masterkey,
    });

    const newProfilePic = new ProfilePic({
      owner: newRoot._id,
      pathFile: DEFAULT_PROFILE_PIC,
    });

    newRoot.profilePic = newProfilePic._id;

    await newProfilePic.save();
    await newRoot.save({ session });

    await session.commitTransaction();
    session.endSession();
    console.log("Root account created successfully");
    res.status(201).json({ message: "Root account created successfully" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const sendRootAccount = async (req: RootRequest, res: Response, next: NextFunction) => {
  try {
    const root = req.account;
    if (!root) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);

    res.status(200).json({
      username: root.username,
      email: root.email,
      firstName: root.firstName,
      lastName: root.lastName,
      roles: root.roles,
      AccReq: root.AccReq,
    });
  } catch (error) {
    next(error);
  }
};

export const updateRootAccount = async (req: RootRequest, res: Response, next: NextFunction) => {
  try {
    const root = req.account;
    if (!root) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);

    const { firstName, lastName, email, password, masterkey } = req.body;

    root.firstName = firstName || root.firstName;
    root.lastName = lastName || root.lastName;
    root.email = email || root.email;
    root.password = password || root.password;
    root.masterkey = masterkey || root.masterkey;
    root.updatedAt = new Date();
    root.updatedBy = root._id;

    await root.save();
    res.status(200).json({ message: "Root account updated successfully" });
  } catch (error) {
    next(error);
  }
};

export const acceptAdminRequest = async (req: RootRequest, res: Response, next: NextFunction) => {
  const session = await startSession();
  session.startTransaction();
  try {
    const root = req.account;
    if (!root) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    const admin = req.admin;
    if (!admin) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);

    admin.isAccepted = true;
    admin.issuedAt = new Date();
    admin.issuedBy = root._id;
    root.AccReq = root.AccReq.filter((id) => id.toString() !== admin._id.toString());
    admin.updatedAt = new Date();
    admin.updatedBy = root._id;
    admin.isDeleted = false;
    await admin.save({ session });
    await root.save({ session });
    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: "Admin request accepted successfully" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const rejectAdminRequest = async (req: RootRequest, res: Response, next: NextFunction) => {
  const session = await startSession();
  session.startTransaction();
  try {
    const root = req.account;
    if (!root) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    const admin = req.admin;
    if (!admin) throw new HttpError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, 404);
    admin.isAccepted = false;
    admin.deletedAt = new Date();
    admin.deletedBy = root._id;
    admin.isDeleted = true;
    root.AccReq = root.AccReq.filter((id) => id.toString() !== admin._id.toString());
    admin.issuedAt = new Date();
    admin.issuedBy = root._id;

    await root.save({ session });
    await admin.save({ session });
    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: "Admin request rejected successfully" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const getAdmin = async (req: RootRequest, res: Response, next: NextFunction) => {
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

export const validateMasterkey = async (req: RootRequest, res: Response, next: NextFunction) => {
  try {
    const { masterkey } = req.body;
    if (!masterkey) return next();
    const isExists = await isMasterKeyExists(masterkey);
    if (isExists) throw new HttpError(ERROR_MESSAGES.MASTER_KEY_EXISTS, 400);
    next();
  } catch (error) {
    next(error);
  }
};
