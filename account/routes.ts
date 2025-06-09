import { Router } from "express";
import userRoutes from "./user/routes";
import adminRoutes from "./admin/routes";
import rootRoutes from "./root/routes";
import { loginLimiter, authAccount, generateToken, registerLimiter } from "./middlewares";
const accountRoutes = Router();

accountRoutes.use("/user", userRoutes);
accountRoutes.use("/admin", adminRoutes);
accountRoutes.use("/root", rootRoutes);

export default accountRoutes;
