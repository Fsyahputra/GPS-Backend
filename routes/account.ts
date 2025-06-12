import { Router } from "express";
import userRoutes from "./user";
import adminRoutes from "./admin";
import rootRoutes from "./root";
const accountRoutes = Router();

accountRoutes.use("/user", userRoutes);
accountRoutes.use("/admin", adminRoutes);
accountRoutes.use("/root", rootRoutes);

export default accountRoutes;
