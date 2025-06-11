import { Router } from "express";
import {
  accountLogout,
  authAccount,
  deleteAccount,
  deleteDevice,
  deleteProfilePic,
  generateToken,
  getDevices,
  handleValidators,
  loginLimiter,
  registerLimiter,
  sendDevices,
  updateDevice,
  updateProfilePic,
  validateDeviceName,
  validateLoginInput,
  validateRegisterInput,
  validateRole,
  validateToken,
  validateUpdateInput,
} from "../middlewares/common";
import { validateAdmin } from "../middlewares/admin";
import { sendUserAccount, updateUserAccount, registerDevice, createAccount } from "../middlewares/user";

const userRoutes = Router();
const deviceRoutes = Router();
const deviceIdRoutes = Router({ mergeParams: true });
userRoutes.post("/register", registerLimiter, ...validateRegisterInput, createAccount);
userRoutes.post("/login", loginLimiter, validateLoginInput, handleValidators, authAccount, generateToken);

userRoutes.use(validateToken);
userRoutes.use(validateRole(["User", "Admin", "Root"]));
userRoutes.use(validateAdmin);

deviceRoutes.post("/:deviceID", registerDevice);
deviceRoutes.get("/", getDevices, sendDevices);

deviceIdRoutes.use(getDevices);
deviceIdRoutes.delete("/", deleteDevice);
deviceIdRoutes.put("/", validateDeviceName, updateDevice);

deviceRoutes.use("/:deviceID", deviceIdRoutes);
userRoutes.use("/device/", deviceRoutes);

userRoutes.get("/", sendUserAccount);
userRoutes.put("/", ...validateUpdateInput, updateUserAccount);
userRoutes.delete("/", deleteAccount);
userRoutes.get("/logout", accountLogout);
userRoutes.put("/profile-pic", updateProfilePic);
userRoutes.delete("/profile-pic", deleteProfilePic);

export default userRoutes;
