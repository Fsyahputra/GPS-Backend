import { Router } from "express";
import {
  accountLogout,
  authAccount,
  deleteAccount,
  deleteProfilePic,
  deviceNameValidator,
  generateToken,
  getDevices,
  loginLimiter,
  registerLimiter,
  updateAccountValidators,
  updateDevice,
  updateProfilePic,
  validateRegisterInput,
  validateRole,
  validateToken,
} from "../middlewares";
import { emailValidator, handleValidators, passwordValidator } from "../validators";
import { validateAdmin } from "../admin/middlewares";
import { sendUserAccount, updateUserAccount, registerDevice, deleteDevice, createAccount } from "./middlewares";

const userRoutes = Router();
const deviceRoutes = Router();
userRoutes.post("/register", registerLimiter, validateRegisterInput, createAccount);
userRoutes.post("/login", loginLimiter, emailValidator(), passwordValidator(), handleValidators, authAccount, generateToken);

userRoutes.use(validateToken);
userRoutes.use(validateRole(["User", "Admin", "Root"]));
userRoutes.use(validateAdmin);

deviceRoutes.post("/register/:deviceID", registerDevice);
deviceRoutes.get("/", getDevices);
deviceRoutes.delete("/:deviceID", deleteDevice);
deviceRoutes.put("/:deviceID", deviceNameValidator, updateDevice);

userRoutes.use("/device", deviceRoutes);

userRoutes.get("/", sendUserAccount);
userRoutes.put("/", updateAccountValidators, updateUserAccount);
userRoutes.delete("/", deleteAccount);
userRoutes.get("/logout", accountLogout);
userRoutes.put("/profile-pic", updateProfilePic);
userRoutes.delete("/profile-pic", deleteProfilePic);

export default userRoutes;
