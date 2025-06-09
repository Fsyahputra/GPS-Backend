import { Router } from "express";
import {
  accountLogout,
  authAccount,
  deleteAccount,
  deleteProfilePic,
  generateToken,
  getDevices,
  loginLimiter,
  registerLimiter,
  sendDevices,
  updateDevice,
  updateProfilePic,
  validateRegisterInput,
  validateRole,
  validateToken,
  validateUpdateInput,
} from "../middlewares";
import { deviceNameValidators, loginValidators } from "../validators";
import { validateAdmin } from "../admin/middlewares";
import { sendUserAccount, updateUserAccount, registerDevice, deleteDevice, createAccount } from "./middlewares";

const userRoutes = Router();
const deviceRoutes = Router();
const deviceIdRoutes = Router({ mergeParams: true });
userRoutes.post("/register", registerLimiter, validateRegisterInput, createAccount);
userRoutes.post("/login", loginLimiter, loginValidators, authAccount, generateToken);

userRoutes.use(validateToken);
userRoutes.use(validateRole(["User", "Admin", "Root"]));
userRoutes.use(validateAdmin);

deviceRoutes.post("/:deviceID", registerDevice);
deviceRoutes.get("/", getDevices, sendDevices);

deviceIdRoutes.use(getDevices);
deviceIdRoutes.delete("/", deleteDevice);
deviceIdRoutes.put("/", deviceNameValidators, updateDevice);

deviceRoutes.use("/:deviceID", deviceIdRoutes);
userRoutes.use("/device/", deviceRoutes);

userRoutes.get("/", sendUserAccount);
userRoutes.put("/", validateUpdateInput, updateUserAccount);
userRoutes.delete("/", deleteAccount);
userRoutes.get("/logout", accountLogout);
userRoutes.put("/profile-pic", updateProfilePic);
userRoutes.delete("/profile-pic", deleteProfilePic);

export default userRoutes;
