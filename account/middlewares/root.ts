import Root, { type RootDoc } from "../root/rootModels";
import type { NextFunction, Response } from "express";
import { HttpError } from "@/utils/HttpError";
import { ERROR_MESSAGES } from "@/constants";
import { startSession } from "mongoose";
import { DEFAULT_PROFILE_PIC, ProfilePic } from "../models";
import type { AdminRequest } from "./admin";
import type { AdminDoc } from "../admin/models";

export interface RootRequest extends Omit<AdminRequest, "account"> {
  account?: RootDoc;
  admin?: AdminDoc;
}

export const createRootAccount = async (req: RootRequest, res: Response, next: NextFunction) => {
  const session = await startSession();
  session.startTransaction();

  try {
    const root = req.account;
    if (!root) throw new HttpError(ERROR_MESSAGES.INVALID_CREDENTIALS, 404);

    const newRoot = new Root({
      username: root.username,
      password: root.password,
      email: root.email,
      firstName: root.firstName,
      lastName: root.lastName,
      roles: "Root",
      AccReq: root.AccReq || [],
      masterkey: root.masterkey,
    });

    const newProfilePic = new ProfilePic({
      owner: newRoot._id,
      pathFile: DEFAULT_PROFILE_PIC,
    });

    newRoot.profilePic = newProfilePic._id;
    await newProfilePic.save({ session });
    await newRoot.save({ session });
    res.status(201).json("Root account created successfully");
  } catch (error) {
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

    const { firstName, lastName, email } = req.body;

    root.firstName = firstName || root.firstName;
    root.lastName = lastName || root.lastName;
    root.email = email || root.email;

    await root.save();
    res.status(200).json("Root account updated successfully");
  } catch (error) {
    next(error);
  }
};
