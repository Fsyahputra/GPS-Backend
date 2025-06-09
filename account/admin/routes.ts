import { Router } from "express";
import { accountLogout, authAccount, deleteAccount, deleteProfilePic, loginLimiter, registerLimiter, validateUpdateInput, updateDevice, updateProfilePic, validateRole, validateToken } from "../middlewares";
import { validateRegisterInput } from "../middlewares";
import { deviceNameValidators, loginValidators, usernameValidator } from "../validators";
import { createAdminAccount, deleteAdminAccount, generateAdminToken, sendAdminAccount, updateAdminAccount, validateAdmin, sendUserAccount, updateUserAccount, getUser, getDevices } from "./middlewares";
const adminAccountRoutes = Router();
const userRoutes = Router();
const devicesRoutes = Router();

adminAccountRoutes.post("/register", registerLimiter, validateRegisterInput, createAdminAccount);
adminAccountRoutes.post("/login", loginLimiter, loginValidators, authAccount, generateAdminToken);

adminAccountRoutes.use(validateToken);
adminAccountRoutes.use(validateRole(["Admin", "Root"]));

adminAccountRoutes.put("/", validateUpdateInput, updateAdminAccount);
adminAccountRoutes.delete("/", deleteAdminAccount);
adminAccountRoutes.get("/", sendAdminAccount);
adminAccountRoutes.get("/logout", accountLogout);
adminAccountRoutes.put("/profile-pic", updateProfilePic);
adminAccountRoutes.delete("/profile-pic", deleteProfilePic);

devicesRoutes.get("/", (req, res, next) => {
  res.status(501).json({ message: "Not implemented yet" });
});
devicesRoutes.put("/:deviceID", deviceNameValidators, updateDevice);

userRoutes.get("/", sendUserAccount);
userRoutes.put("/", validateUpdateInput, updateUserAccount);
userRoutes.delete("/", deleteAccount);

userRoutes.use("/device/", getDevices, devicesRoutes);
adminAccountRoutes.use("/user/:username", validateAdmin, usernameValidator(true, "param"), getUser, userRoutes);

export default adminAccountRoutes;
