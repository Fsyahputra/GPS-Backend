import { Router } from "express";
import { authAccount, deleteProfilePic, generateToken, loginLimiter, registerLimiter, updateAccountValidators, updateProfilePic, validateRegisterInput, validateRole, validateToken } from "../middlewares";
import { emailValidator, handleValidators, passwordValidator } from "../validators";
import { validateAdmin } from "../admin/middlewares";
import { deleteUserAccount, sendUserAccount, updateUserAccount, registerDevice, getDevices, updateDevice, deviceNameValidator, deleteDevice, createAccount, userLogout } from "./middlewares";

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
userRoutes.delete("/", deleteUserAccount);
userRoutes.get("/logout", userLogout);
userRoutes.put("/profile-pic", updateProfilePic);
userRoutes.delete("/profile-pic", deleteProfilePic);

export default userRoutes;
