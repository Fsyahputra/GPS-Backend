import { Router } from "express";
import {
  accountLogout,
  authAccount,
  deleteAccount,
  deleteProfilePic,
  loginLimiter,
  registerLimiter,
  validateUpdateInput,
  updateDevice,
  updateProfilePic,
  validateRole,
  validateToken,
  sendDevices,
  deleteDevice,
  handleValidators,
  validateLoginInput,
  validateDeviceName,
  validateUsername,
  determineType,
  validateRegisterInput,
} from "@/middlewares/common";
import { createAdminAccount, generateAdminToken, validateAdmin } from "@/middlewares/admin";
import { deleteAdminAccount, getDevices, getUser, sendAdminAccount, sendUserAccount, updateAdminAccount, updateUserAccount } from "@/middlewares/adminRootShared";

const adminAccountRoutes = Router();
const userRoutes = Router();
const devicesRoutes = Router();

adminAccountRoutes.post("/register", registerLimiter, ...validateRegisterInput, createAdminAccount);
adminAccountRoutes.post("/login", loginLimiter, validateLoginInput, handleValidators, authAccount, generateAdminToken);

adminAccountRoutes.use(validateToken);
adminAccountRoutes.use(validateRole(["Admin", "Root"]));
adminAccountRoutes.use(determineType);

adminAccountRoutes.put("/", ...validateUpdateInput, updateAdminAccount);
adminAccountRoutes.delete("/", deleteAdminAccount);
adminAccountRoutes.get("/", sendAdminAccount);
adminAccountRoutes.get("/logout", accountLogout);
adminAccountRoutes.put("/profile-pic", updateProfilePic);
adminAccountRoutes.delete("/profile-pic", deleteProfilePic);

devicesRoutes.get("/", sendDevices);
devicesRoutes.put("/:deviceID", validateDeviceName, updateDevice);
devicesRoutes.delete("/:deviceID", deleteDevice);

userRoutes.get("/", sendUserAccount);
userRoutes.put("/", ...validateUpdateInput, updateUserAccount);
userRoutes.delete("/", deleteAccount);

userRoutes.use("/device/", getDevices, devicesRoutes);
adminAccountRoutes.use("/user/:username", validateAdmin, validateUsername, getUser, userRoutes);

export default adminAccountRoutes;
