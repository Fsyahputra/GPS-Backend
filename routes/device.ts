import { Router } from "express";
import { checkNewConfig, decryptDeviceRequest, encryptResponse, findOwnerDevice, saveLocationToDB, sendConfigToDevice, sendLastCommandToDevice } from "@/middlewares/device";

const deviceRoutes = Router({ mergeParams: true });
const configRoutes = Router({ mergeParams: true });

deviceRoutes.use(findOwnerDevice);
configRoutes.get("/", sendConfigToDevice);
configRoutes.get("/check-new-config", checkNewConfig);

deviceRoutes.post("/location", decryptDeviceRequest, saveLocationToDB);
deviceRoutes.get("/command", sendLastCommandToDevice);

deviceRoutes.use("/config", configRoutes);

deviceRoutes.use(encryptResponse);

export default deviceRoutes;
