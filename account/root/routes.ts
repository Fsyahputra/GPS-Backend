import { Router } from "express";
import { authAccount, generateToken, loginLimiter, registerLimiter, validateRegisterInput, validateRole, validateToken } from "../middlewares";
import { emailValidator, passwordValidator, updateAccountValidators } from "../validators";
import { sendRootAccount, updateRootAccount } from "./middlewares";
const rootRoutes = Router();

rootRoutes.use(validateRole(["Root"]));
rootRoutes.post("/register", registerLimiter, validateRegisterInput);
rootRoutes.post("/login", emailValidator(), passwordValidator(), loginLimiter, authAccount, generateToken);

rootRoutes.use(validateToken);

rootRoutes.get("/:username", sendRootAccount);
rootRoutes.put("/:username", updateAccountValidators, updateRootAccount);

export default rootRoutes;
