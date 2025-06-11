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
  validateUsername,
} from "../middlewares/common";
import { createRootAccount, sendRootAccount, updateRootAccount } from "../middlewares/root";
import { deleteAdminAccount, getAdmin, getUser, sendAdminAccount, sendUserAccount, updateAdminAccount, updateUserAccount } from "../middlewares/adminRootShared";
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
adminRoutes.put("/", ...validateUpdateInput, updateAdminAccount);
adminRoutes.delete("/", deleteAdminAccount);

rootRoutes.use("/admin/:username", validateUsername, getAdmin, adminRoutes);

userRoutes.get("/", sendUserAccount);
userRoutes.put("/", ...validateUpdateInput, updateUserAccount);

rootRoutes.use("/user/:username", validateUsername, getUser, userRoutes);

export default rootRoutes;
