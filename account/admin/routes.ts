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
} from "../middlewares/common";
import { validateRegisterInput } from "../middlewares/common";
import { usernameValidator } from "../validators";
import { createAdminAccount, deleteAdminAccount, generateAdminToken, sendAdminAccount, updateAdminAccount, validateAdmin, sendUserAccount, updateUserAccount, getDevices } from "../middlewares/admin";
import { getUser } from "../middlewares/adminRootShared";

const adminAccountRoutes = Router();
const userRoutes = Router();
const devicesRoutes = Router();

adminAccountRoutes.post("/register", registerLimiter, ...validateRegisterInput, createAdminAccount);
adminAccountRoutes.post("/login", loginLimiter, validateLoginInput, handleValidators, authAccount, generateAdminToken);

adminAccountRoutes.use(validateToken);
adminAccountRoutes.use(validateRole(["Admin", "Root"]));

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
adminAccountRoutes.use("/user/:username", validateAdmin, usernameValidator(true, "param"), getUser, userRoutes);

export default adminAccountRoutes;
