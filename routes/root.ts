import { Router } from "express";
import {
  accountLogout,
  authAccount,
  deleteAccount,
  deleteDevice,
  deleteProfilePic,
  determineType,
  generateToken,
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
  validateUsername,
} from "@/middlewares/common";
import { acceptAdminRequest, createRootAccount, getAdmin, rejectAdminRequest, sendRootAccount, updateRootAccount, validateMasterkey } from "@/middlewares/root";
import { deleteAdminAccount, getDevices, getUser, sendAdminAccount, sendUserAccount, updateAdminAccount, updateUserAccount } from "@/middlewares/adminRootShared";
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
userRoutes.delete("/", deleteAccount);

deviceRoutes.get("/", sendDevices);
deviceRoutes.put("/:deviceID", validateDeviceName, updateDevice);
deviceRoutes.delete("/:deviceID", deleteDevice);

userRoutes.use("/device/", getDevices, deviceRoutes);

rootRoutes.use("/user/:username", validateUsername, getUser, determineType, userRoutes);

export default rootRoutes;
