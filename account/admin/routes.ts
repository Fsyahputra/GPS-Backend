import { Router } from "express";
import { authAccount, generateToken, getUser, loginLimiter, registerLimiter, updateAccountValidators, validateRole, validateToken } from "../middlewares";
import { validateRegisterInput } from "../middlewares";
import { emailValidator, passwordValidator } from "../validators";
import { createAdminAccount, deleteAdminAccount, generateAdminToken, sendAdminAccount, updateAdminAccount } from "./middlewares";
const adminRoutes = Router();

adminRoutes.post("/register", registerLimiter, validateRegisterInput, createAdminAccount);
adminRoutes.post("/login", loginLimiter, emailValidator(), passwordValidator(), authAccount, generateAdminToken);

adminRoutes.use(validateToken);
adminRoutes.use(validateRole(["Admin", "Root"]));

adminRoutes.put("/:username", updateAccountValidators, getUser, updateAdminAccount);
adminRoutes.delete("/:username", getUser, deleteAdminAccount);
adminRoutes.get("/:username", getUser, sendAdminAccount);
adminRoutes.post("/accept-admin/:username", getUser, validateRole(["Root"]), updateAdminAccount);

export default adminRoutes;
