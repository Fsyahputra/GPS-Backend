import { Router } from "express";
import { authAccount, generateToken, handleValidators, loginLimiter, registerLimiter, validateLoginInput, validateRegisterInput, validateRole, validateToken } from "../middlewares";
import { loginValidators, updateAccountValidators } from "../validators";
import { sendRootAccount, updateRootAccount } from "./middlewares";
const rootRoutes = Router();

rootRoutes.use(validateRole(["Root"]));
rootRoutes.post("/register", registerLimiter, validateRegisterInput);
rootRoutes.post("/login", loginLimiter, validateLoginInput, handleValidators, authAccount, generateToken);

rootRoutes.use(validateToken);

rootRoutes.get("/:username", sendRootAccount);
rootRoutes.put("/:username", updateAccountValidators, updateRootAccount);

export default rootRoutes;
