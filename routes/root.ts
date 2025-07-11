import { Router } from "express";
import {
  accountLogout,
  authAccount,
  deleteProfilePic,
  determineType,
  generateToken,
  handleValidators,
  loginLimiter,
  registerLimiter,
  sendDevices,
  updateProfilePic,
  validateDeviceName,
  validateLoginInput,
  validateRegisterInput,
  validateRole,
  validateToken,
  validateUpdateInput,
  validateUsername,
} from "@/middlewares/common";
import { acceptAdminRequest, createRootAccount, getAdmin, rejectAdminRequest, sendRootAccount, updateRootAccount, validateMasterkey } from "@/middlewares/root";
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
const rootRoutes = Router();
const adminRoutes = Router();
const userRoutes = Router();
const deviceRoutes = Router();

rootRoutes.post("/register", registerLimiter, ...validateRegisterInput, validateMasterkey, createRootAccount);
rootRoutes.post("/login", loginLimiter, validateLoginInput, handleValidators, authAccount, generateToken);

rootRoutes.use(validateToken);
rootRoutes.use(validateRole(["Root"]));
rootRoutes.get("/", sendRootAccount);
rootRoutes.put("/", ...validateUpdateInput, validateMasterkey, updateRootAccount);
rootRoutes.get("/logout", accountLogout);
rootRoutes.put("/profile-pic", updateProfilePic);
rootRoutes.delete("/profile-pic", deleteProfilePic);

adminRoutes.get("/", sendAdminAccount);
adminRoutes.put("/", ...validateUpdateInput, updateAdminAccount);
adminRoutes.delete("/", deleteAdminAccount);
adminRoutes.post("/acc", acceptAdminRequest);
adminRoutes.post("/reject", rejectAdminRequest);

rootRoutes.use("/admin/:username", validateUsername, getAdmin, determineType, adminRoutes);

userRoutes.get("/", sendUserAccount);
userRoutes.put("/", ...validateUpdateInput, updateUserAccount);
userRoutes.delete("/", deleteUserAccount);

deviceRoutes.get("/", sendDevices);
deviceRoutes.put("/:deviceID", validateDeviceName, updateUserDevice);
deviceRoutes.delete("/:deviceID", deleteUserDevice);
deviceRoutes.post("/:deviceID/send-command", ...validateCommand, sendCommandToUserDevice);
deviceRoutes.put("/:deviceID/config", validateConfigFile, updateConfig);

userRoutes.use("/device/", getDevices, deviceRoutes);

rootRoutes.use("/user/:username", validateUsername, getUser, determineType, userRoutes);

export default rootRoutes;
