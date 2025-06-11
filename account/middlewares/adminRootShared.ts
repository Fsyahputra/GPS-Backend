import type { NextFunction, Response } from "express";
import { HttpError } from "@/utils/HttpError";
import { ERROR_MESSAGES } from "@/constants";
import Admin from "../admin/models";
import type { RootRequest } from "./root";
import type { AdminRequest } from "./admin";
import User from "../user/models";

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
