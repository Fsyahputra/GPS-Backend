import { ERROR_MESSAGES } from "@/constants";
import type { DecryptedDeviceRequest, EncryptedData, EncryptedDeviceRequest, LocationType } from "@/types/types";
import type { Response, NextFunction } from "express";
import { decryptRequestData, encryptResponseData } from "@/service/device";
import { HttpError } from "@/utils/HttpError";
import Device from "@/model/device";
import Config from "@/model/config";
import { startSession } from "mongoose";
import Location from "@/model/location";

export const decryptDeviceRequest = async (req: EncryptedDeviceRequest, res: Response, next: NextFunction) => {
  // this Function Encrypts and Find Device
  try {
    const encryptedData: EncryptedData = {
      iv: req.body.iv,
      cipherText: req.body.cipherText,
    };
    const deviceID = req.params.deviceID;
    if (!encryptedData.iv || !encryptedData.cipherText || !deviceID) {
      throw new HttpError(ERROR_MESSAGES.INVALID_DEVICE_REQUEST, 400);
    }

    const device = await Device.findOne({ deviceID });
    if (!device || !device.key) {
      throw new HttpError(ERROR_MESSAGES.DEVICE_NOT_FOUND, 404);
    }

    const decryptedData = decryptRequestData(encryptedData, device.key);
    if (!decryptedData) {
      throw new HttpError(ERROR_MESSAGES.DECRYPT_FAILED, 500);
    }
    req.decryptedData = decryptedData;
    req.device = device;
    next();
  } catch (error) {
    next(error);
  }
};

export const findOwnerDevice = async (req: DecryptedDeviceRequest, res: Response, next: NextFunction) => {
  try {
    const deviceID = req.params.deviceID;
    if (!deviceID) {
      throw new HttpError(ERROR_MESSAGES.INVALID_DEVICE_REQUEST, 400);
    }
    const device = await Device.findOne({ deviceID });
    if (!device || !device.owner) {
      throw new HttpError(ERROR_MESSAGES.DEVICE_NOT_FOUND, 404);
    }
    req.device = device;
    next();
  } catch (error) {
    next(error);
  }
};

export const encryptResponse = (req: DecryptedDeviceRequest, res: Response, next: NextFunction) => {
  try {
    const response = req.response;
    const key = req.device?.key;
    if (!response || !key) {
      throw new HttpError(ERROR_MESSAGES.INVALID_DEVICE_REQUEST, 400);
    }
    const encryptedResponse = encryptResponseData(response, key);
    if (!encryptedResponse) {
      throw new HttpError(ERROR_MESSAGES.FORBIDDEN, 400);
    }

    const payload: EncryptedData = {
      iv: encryptedResponse.iv,
      cipherText: encryptedResponse.cipherText,
    };

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

export const sendConfigToDevice = async (req: DecryptedDeviceRequest, res: Response, next: NextFunction) => {
  const session = await startSession();
  session.startTransaction();
  try {
    const device = req.device;
    if (!device) {
      throw new HttpError(ERROR_MESSAGES.DEVICE_NOT_FOUND, 404);
    }

    const configId = device.currentConfigId;
    const config = await Config.findById(configId).lean().session(session);
    const payload = {
      espConfig: config?.espConfig,
      initCommand: config?.initCommand,
      gpsThreshold: config?.gpsThreshold,
      networkConfig: config?.networkConfig,
    };

    device.isNewConfig = false;
    device.currentConfigId = configId;
    await device.save({ session });
    await session.commitTransaction();
    session.endSession();
    req.response = payload;
    next();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const checkNewConfig = (req: DecryptedDeviceRequest, res: Response, next: NextFunction) => {
  try {
    const device = req.device;
    if (!device) {
      throw new HttpError(ERROR_MESSAGES.DEVICE_NOT_FOUND, 404);
    }
    const payload = {
      isNewConfig: device.isNewConfig,
    };
    req.response = payload;
    next();
  } catch (error) {
    next(error);
  }
};

export const saveLocationToDB = async (req: DecryptedDeviceRequest, res: Response, next: NextFunction) => {
  const session = await startSession();
  session.startTransaction();
  try {
    const locationData = req.decryptedData as LocationType;
    if (!locationData || !locationData.lat || !locationData.lon) {
      throw new HttpError(ERROR_MESSAGES.INVALID_DEVICE_REQUEST, 400);
    }
    const device = req.device;
    if (!device) {
      throw new HttpError(ERROR_MESSAGES.DEVICE_NOT_FOUND, 404);
    }
    const ownerId = device.owner;
    if (!ownerId) {
      throw new HttpError(ERROR_MESSAGES.DEVICE_NOT_FOUND, 404);
    }
    const newLocation = new Location({
      lat: locationData.lat,
      lon: locationData.lon,
      device: device._id,
      owner: ownerId,
      hdop: locationData.hdop,
    });

    device.lastLocation = newLocation._id;
    device.lastOnline = new Date();

    await newLocation.save({ session });
    await device.save({ session });
    await session.commitTransaction();
    session.endSession();
    req.response = { message: "Location saved successfully" };
    next();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const sendLastCommandToDevice = (req: DecryptedDeviceRequest, res: Response, next: NextFunction) => {
  try {
    const device = req.device;
    if (!device) {
      throw new HttpError(ERROR_MESSAGES.DEVICE_NOT_FOUND, 404);
    }
    const payload = {
      lastCommand: device.lastCommand,
    };
    req.response = payload;
    next();
  } catch (error) {
    next(error);
  }
};
