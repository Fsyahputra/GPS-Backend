import { Router } from "express";
import {
  accountLogout,
  authAccount,
  generateToken,
  handleValidators,
  loginLimiter,
  registerLimiter,
  updateProfilePic,
  validateLoginInput,
  validateRegisterInput,
  validateRole,
  validateToken,
  validateUpdateInput,
} from "../middlewares/common";
import { createRootAccount, sendRootAccount, updateRootAccount } from "../middlewares/root";
import { usernameValidator } from "../validators";
import { sendAdminAccount, sendUserAccount } from "../middlewares/admin";
import { getAdmin, getUser } from "../middlewares/adminRootShared";
const rootRoutes = Router();
const adminRoutes = Router();
const userRoutes = Router();

rootRoutes.use(validateRole(["Root"]));
rootRoutes.post("/register", registerLimiter, ...validateRegisterInput, createRootAccount);
rootRoutes.post("/login", loginLimiter, validateLoginInput, handleValidators, authAccount, generateToken);

rootRoutes.use(validateToken);
rootRoutes.use(validateRole(["Root"]));

rootRoutes.get("/", sendRootAccount);
rootRoutes.put("/", ...validateUpdateInput, updateRootAccount);
rootRoutes.get("/logout", accountLogout);
rootRoutes.put("/profile-pic", updateProfilePic);
rootRoutes.delete("/profile-pic", updateProfilePic);

adminRoutes.get("/", sendAdminAccount);

rootRoutes.use("/admin/:username", usernameValidator(true, "param"), getAdmin, adminRoutes);

userRoutes.get("/", sendUserAccount);

rootRoutes.use("/user/:username", usernameValidator(true, "param"), getUser, userRoutes);

export default rootRoutes;
