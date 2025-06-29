import { Router } from "express";
import {
  accountLogout,
  authAccount,
  deleteProfilePic,
  loginLimiter,
  registerLimiter,
  validateUpdateInput,
  updateProfilePic,
  validateRole,
  validateToken,
  sendDevices,
  handleValidators,
  validateLoginInput,
  validateDeviceName,
  validateUsername,
  determineType,
  validateRegisterInput,
} from "@/middlewares/common";
import { createAdminAccount, generateAdminToken, validateAdmin } from "@/middlewares/admin";
import {
  deleteAdminAccount,
  deleteUserAccount,
  deleteUserDevice,
  getDevices,
  getUser,
  sendAdminAccount,
  sendCommandToUserDevice,
  sendUserAccount,
  updateAdminAccount,
  updateConfig,
  updateUserAccount,
  updateUserDevice,
  validateCommand,
  validateConfigFile,
} from "@/middlewares/adminRootShared";

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
devicesRoutes.put("/:deviceID", validateDeviceName, updateUserDevice);
devicesRoutes.delete("/:deviceID", deleteUserDevice);
devicesRoutes.post("/:deviceID/send-command", ...validateCommand, sendCommandToUserDevice);
devicesRoutes.put("/:deviceID/config", validateConfigFile, updateConfig);

userRoutes.get("/", sendUserAccount);
userRoutes.put("/", ...validateUpdateInput, updateUserAccount);
userRoutes.delete("/", deleteUserAccount);

userRoutes.use("/device/", getDevices, devicesRoutes);
adminAccountRoutes.use("/user/:username", validateAdmin, validateUsername, getUser, userRoutes);

export default adminAccountRoutes;
