import { describe, it, expect, beforeAll, afterAll, mock, beforeEach } from "bun:test";
import { decryptRequestData, encryptResponseData, encryptData, decryptData, generateB64SecretKey, generateB64IV, generateSecretKey, generateRandomIV } from "../service/device";
import type { ConfigDoc, ConfigType, DeviceDoc, DeviceType, EncryptedData, LocationDoc } from "@/types/types";
import dotenv, { config } from "dotenv";
import Device from "@/model/device";
import { checkNewConfig, decryptDeviceRequest, encryptResponse, findOwnerDevice, sendLastCommandToDevice } from "@/middlewares/device";
import connectDB from "@/main/database";
import mongoose from "mongoose";
import supertest from "supertest";
import app from "@/main/app";
import Config from "@/model/config";
import Location from "@/model/location";

dotenv.config();
const originalConsoleError = console.error;
const originalDeviceFindOne = Device.findOne;
const BASE_DEVICE_URL = "/api/device/";
const DB_ADDRESS = process.env.DB_ADDRESS_TEST || "mongodb://localhost:27017/test";
const DB_PORT = process.env.DB_PORT_TEST || "27017";
const REPLICA_SET = process.env.REPLICA_SET_TEST || "rs0";
const DB_URI = `mongodb://${DB_ADDRESS}:${DB_PORT}/?replicaSet=${REPLICA_SET}`;

beforeAll(() => {
  console.error = (...args) => {
    return;
  };
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe("Encrypt and decrypt", () => {
  it("Should Encrypt and Decrypt", () => {
    const secretKey = generateSecretKey();
    const iv = generateRandomIV();
    const message = "This Message is Secret";
    const messageBuffer = Buffer.from(message);
    const encryptedMessageBuffer = encryptData(messageBuffer, secretKey, iv);
    const decryptedMessageBuffer = decryptData(encryptedMessageBuffer, secretKey, iv);
    const decryptedMessage = decryptedMessageBuffer.toString();
    expect(encryptedMessageBuffer).toBeInstanceOf(Buffer);
    expect(decryptedMessageBuffer).toBeInstanceOf(Buffer);
    expect(decryptedMessage).toBe(message);
  });

  it("Should Decrypt Request Data", () => {
    const plainRequestData = { message: "This is a test message" };
    const secretKey = generateSecretKey();
    const iv = generateRandomIV();
    const PlainRequestStr = JSON.stringify(plainRequestData);
    const plainRequestBuffer = Buffer.from(PlainRequestStr);
    const encryptedData = encryptData(plainRequestBuffer, secretKey, iv);
    const b64SecretKey = secretKey.toString("base64");
    const b64IV = iv.toString("base64");
    const encryptedRequestData: EncryptedData = {
      iv: b64IV,
      cipherText: encryptedData.toString("base64"),
    };
    const decryptedData = decryptRequestData(encryptedRequestData, b64SecretKey);
    expect(decryptedData).toEqual(plainRequestData);
  });

  it("Should Encrypt Response Data", () => {
    const responseData = { message: "This is a response message" };
    const b64SecretKey = generateB64SecretKey();
    const encryptedResponseData = encryptResponseData(responseData, b64SecretKey);

    if (!encryptedResponseData) {
      throw new Error("Encryption failed");
    }
    expect(encryptedResponseData).toBeDefined();
    expect(encryptedResponseData.iv).toBeDefined();
    expect(encryptedResponseData.cipherText).toBeDefined();
    expect(encryptedResponseData.iv).toBeTypeOf("string");
    expect(encryptedResponseData.cipherText).toBeTypeOf("string");
  });
});

describe("middleware Tests", () => {
  // @ts-ignore

  afterAll(() => {
    Device.findOne = originalDeviceFindOne;
  });

  describe("decryptDeviceRequest", () => {
    let res: any;
    let next: any;
    beforeEach(() => {
      res = mock();
      next = mock();
    });

    it("Should decrypt device request data", async () => {
      const plainData = { message: "This is a text message " };
      const secretKey = generateSecretKey();
      const iv = generateRandomIV();
      const plainDataBuffer = Buffer.from(JSON.stringify(plainData));
      const encryptedData = encryptData(plainDataBuffer, secretKey, iv);
      const b64encryptedData = encryptedData.toString("base64");
      const b64SecretKey = secretKey.toString("base64");
      const b64IV = iv.toString("base64");

      const encryptedRequestData: EncryptedData = {
        iv: b64IV,
        cipherText: b64encryptedData,
      };
      // @ts-ignore
      Device.findOne = mock(() =>
        Promise.resolve({
          key: b64SecretKey,
        })
      );

      // @ts-ignore
      const req = {
        body: {
          ...encryptedRequestData,
        },
        params: {
          deviceID: "test-device-123",
        },
      } as any;

      await decryptDeviceRequest(req, res, next);
      expect(req.decryptedData).toEqual(plainData);
      expect(req.device).toBeDefined();
      expect(req.device.key).toBe(b64SecretKey);
      expect(next).toHaveBeenCalled();
    });

    it("Should Throw error if iv, cipherText, or deviceID is missing", async () => {
      let caughtError: any;

      const generateReq = (body: any, params: any): any => {
        return {
          body: body,
          params: params,
        };
      };
      const determineError = (error: any) => {
        expect(error).toBeDefined();
        expect(error.message).toBe("Invalid device request");
        expect(error.status).toBe(400);
      };
      const NotExistReq = generateReq({}, {}) as any;

      next = mock((error: any) => {
        caughtError = error;
      });

      await decryptDeviceRequest(NotExistReq, res, next);
      determineError(caughtError);
      const MissingIvReq = generateReq(
        {
          cipherText: "some-cipher-text",
        },
        {
          deviceID: "test-device-123",
        }
      ) as any;

      await decryptDeviceRequest(MissingIvReq, res, next);
      determineError(caughtError);

      const MissingCipherTextReq = generateReq(
        {
          iv: "some-iv",
        },
        {
          deviceID: "test-device-123",
        }
      );

      await decryptDeviceRequest(MissingCipherTextReq, res, next);
      determineError(caughtError);

      const MissingDeviceIDReq = generateReq(
        {
          iv: "some-iv",
          cipherText: "some-cipher-text",
        },
        {}
      );
      await decryptDeviceRequest(MissingDeviceIDReq, res, next);
      determineError(caughtError);
    });

    it("Should Throw error if device not found", async () => {
      let caughtError: any;

      // @ts-ignore
      Device.findOne = mock(() => Promise.resolve(null));

      const req = {
        body: {
          iv: "some-iv",
          cipherText: "some-cipher-text",
        },
        params: {
          deviceID: "non-existent-device",
        },
      } as any;

      next = mock((error: any) => {
        caughtError = error;
      });

      await decryptDeviceRequest(req, res, next);
      expect(caughtError).toBeDefined();
      expect(caughtError.message).toBe("Device Not Found");
      expect(caughtError.status).toBe(404);
    });
    it("Should Throw error if decryption fails", async () => {
      let caughtError: any;

      // @ts-ignore
      Device.findOne = mock(() =>
        Promise.resolve({
          key: "invalid-key",
        })
      );

      const req = {
        body: {
          iv: "some-iv",
          cipherText: "some-cipher-text",
        },
        params: {
          deviceID: "test-device-123",
        },
      } as any;

      next = mock((error: any) => {
        caughtError = error;
      });

      await decryptDeviceRequest(req, res, next);
      expect(caughtError).toBeDefined();
      expect(caughtError.message).toBe("Failed to decrypt device request");
      console.error(caughtError);
      expect(caughtError.status).toBe(400);
    });
  });

  describe("findOwnerDevice", () => {
    let res: any;
    let next: any;
    let caughtError: any;

    // @ts-ignore
    Device.findOne = null;
    beforeEach(() => {
      res = mock();
      next = mock();
      caughtError = null;
      // @ts-ignore
      Device.findOne = mock(() =>
        Promise.resolve({
          owner: "test-user-123",
        })
      );
    });

    it("Should find owner device", async () => {
      const req = {
        params: {
          deviceID: "test-device-123",
        },
      } as any;
      //@ts-ignore
      await findOwnerDevice(req, res, next);
      expect(req.device).toBeDefined();
      expect(req.device.owner).toBe("test-user-123");
      expect(next).toHaveBeenCalled();
    });

    describe("Error Cases", () => {
      let caughtError: any;
      let next: any;

      beforeEach(() => {
        caughtError = null;
        next = mock((error: any) => {
          caughtError = error;
        });
      });

      const determineError = (error: any, message: string, status: number) => {
        expect(error).toBeDefined();
        expect(error.message).toBe(message);
        expect(error.status).toBe(status);
      };

      it("Should throw error if deviceID is missing", async () => {
        const req = {
          params: {},
        } as any;

        await findOwnerDevice(req, res, next);
        determineError(caughtError, "Invalid device request", 400);
      });

      it("Should throw error if device not found", async () => {
        const req = {
          params: {
            deviceID: "non-existent-device",
          },
        } as any;

        // @ts-ignore
        Device.findOne = mock(async () => null);

        await findOwnerDevice(req, res, next);
        determineError(caughtError, "Device Not Found", 404);
      });
      it("Should throw error if device has no owner", async () => {
        //@ts-ignore
        Device.findOne = mock(async () => {
          return {
            owner: null,
          };
        });

        const req = {
          params: {
            deviceID: "test-device-123",
          },
        } as any;

        await findOwnerDevice(req, res, next);
        determineError(caughtError, "Device Not Found", 404);
      });
    });
  });

  describe("encryptResponse", () => {
    let res: any;
    let next: any;
    beforeEach(() => {
      res = mock();
      next = mock();
    });

    it("Should encrypt response data", () => {
      let encryptedResponse: any = null;
      const b64Key = generateB64SecretKey();
      const responseData = { response: "This is a response message", key: b64Key };
      const req = {
        response: responseData,
        device: {
          key: b64Key,
        },
      };

      res = {
        status: mock().mockReturnThis(),
        json: mock((data: any) => {
          encryptedResponse = data;
        }),
      };
      // @ts-ignore
      encryptResponse(req as any, res, next);
      expect(encryptedResponse).toBeDefined();
      expect(encryptedResponse.iv).toBeDefined();
      expect(encryptedResponse.cipherText).toBeDefined();
      expect(encryptedResponse.iv).toBeTypeOf("string");
      expect(encryptedResponse.cipherText).toBeTypeOf("string");

      const decryptedData = decryptRequestData(encryptedResponse, b64Key);
      expect(decryptedData).toEqual(responseData);
    });

    it("Should return 200 status with encrypted data", () => {
      let encryptedResponse: any = null;
      const b64Key = generateB64SecretKey();
      const responseData = { response: "This is a response message", key: b64Key };

      const req = {
        response: responseData,
        device: {
          key: b64Key,
        },
      };

      const res = {
        status: mock((statusCode: number) => {
          return statusCode;
        }).mockReturnThis(),
        json: mock(),
      };

      // @ts-ignore
      encryptResponse(req as any, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    describe("Error Cases", () => {
      it("Should throw error if response or key is missing", () => {
        let caughtError: any;
        const missingKeyReq = {
          response: { message: "This is a response message" },
          device: {},
        };

        next = mock((error: any) => {
          caughtError = error;
        });

        encryptResponse(missingKeyReq as any, res, next);
        expect(caughtError).toBeDefined();
        expect(caughtError.message).toBe("Invalid device request");
        expect(caughtError.status).toBe(400);

        const missingResponseReq = {
          device: {
            key: "some-key",
          },
        };

        next = mock((error: any) => {
          caughtError = error;
        });

        encryptResponse(missingResponseReq as any, res, next);
        expect(caughtError).toBeDefined();
        expect(caughtError.message).toBe("Invalid device request");
        expect(caughtError.status).toBe(400);
      });

      it("Should throw error if encryption fails", () => {
        const b64Key = generateB64SecretKey();
        const responseData = { response: "This is a response message", key: b64Key };

        const req = {
          response: responseData,
          device: {
            key: "invalid-key",
          },
        };

        let caughtError: any;
        next = mock((error: any) => {
          caughtError = error;
        });

        encryptResponse(req as any, res, next);
        expect(caughtError).toBeDefined();
        expect(caughtError.message).toBe("Resource forbidden");
        expect(caughtError.status).toBe(400);
      });
    });
  });

  describe("checkNewConfig", () => {
    let res: any;
    let next: any;
    beforeEach(() => {
      res = mock();
      next = mock();
    });

    it("Should check if device has new config", async () => {});

    describe("Error Cases", () => {
      let caughtError: any;
      beforeEach(() => {
        caughtError = null;
        next = mock((error: any) => {
          caughtError = error;
        });
      });

      it("Should throw error if device not found", () => {
        const nonExistentDevice = {
          params: {
            deviceID: "non-existent-device",
          },
        } as any;

        // @ts-ignore
        Device.findOne = mock(() => Promise.resolve(null));

        checkNewConfig(nonExistentDevice, res, next);
        expect(caughtError).toBeDefined();
        expect(caughtError.message).toBe("Device Not Found");
        expect(caughtError.status).toBe(404);
      });
    });
  });

  describe("sendLastCommandToDevice", () => {
    let res: any;
    let next: any;
    beforeEach(() => {
      res = mock();
      next = mock();
    });

    it("Should send last command to device", () => {
      const req = {
        device: {
          lastCommand: "AT+CSQ",
        },
      } as any;

      sendLastCommandToDevice(req, res, next);
      expect(req.response).toBeDefined();
      expect(req.response.lastCommand).toBe("AT+CSQ");
      expect(next).toHaveBeenCalled();
    });
  });

  describe("Decrypt -> middleware -> encryptResponse", () => {
    let reqPlainData: any = null;
    let device: any = null;
    let req: any = null;
    let res: any = null;
    let next: any = null;
    let statusCode: number = 0;
    const originalFindOne = Device.findOne;

    beforeEach(() => {
      const b64SecretKey = generateB64SecretKey();
      device = {
        key: b64SecretKey,
      };
      // @ts-ignore
      Device.findOne = mock(() => Promise.resolve(device));
      reqPlainData = {
        someLocationData: "This is a test location data",
      };

      res = mock();
      next = mock();

      const iv = generateB64IV();
      const encryptedData = encryptResponseData(reqPlainData, b64SecretKey);
      if (!encryptedData) {
        throw new Error("Encryption failed");
      }

      req = {
        body: {
          iv: encryptedData.iv,
          cipherText: encryptedData.cipherText,
        },
        params: {
          deviceID: "test-device-123",
        },
      };
    });

    afterAll(() => {
      // Restore the original findOne method
      Device.findOne = originalFindOne;
    });

    describe("findOwnerDevice", async () => {
      it("Should find owner device and decrypt request data", async () => {
        let responseData: any = null;
        //@ts-ignore
        Device.findOne = mock(() => Promise.resolve({ ...device, owner: "test-user-123" }));

        await decryptDeviceRequest(req, res, next);
        expect(req.decryptedData).toEqual(reqPlainData);
        expect(req.device).toBeDefined();
        expect(req.device.key).toBe(device.key);

        await findOwnerDevice(req, res, next);
        expect(req.device.owner).toBe("test-user-123");
        expect(next).toHaveBeenCalled();
      });
    });
    describe("checkNewConfig", () => {
      it("Should check if device has new config", async () => {
        let responseData: any = null;
        let statusCode: number = 0;
        await decryptDeviceRequest(req, res, next);
        expect(req.decryptedData).toEqual(reqPlainData);
        expect(req.device).toBeDefined();
        expect(req.device.key).toBe(device.key);
        req.device = {
          key: device.key,
          isNewConfig: true,
        };

        res = {
          status: mock().mockImplementation((code: number) => {
            statusCode = code;
            return res;
          }),
          json: mock((data: any) => {
            responseData = data;
          }),
        };

        checkNewConfig(req, res, next);
        expect(req.device.isNewConfig).toBe(true);
        expect(req.response).toBeDefined();
        expect(next).toHaveBeenCalled();

        encryptResponse(req, res, next);
        expect(statusCode).toBe(200);

        expect(responseData).toBeDefined();

        expect(responseData.iv).toBeDefined();
        expect(responseData.cipherText).toBeDefined();
        expect(responseData.iv).toBeTypeOf("string");
        expect(responseData.cipherText).toBeTypeOf("string");
        const decryptedData = decryptRequestData(responseData, device.key);
        expect(decryptedData).toEqual(req.response);
      });
    });
    describe("sendLastCommandToDevice", () => {
      it("Should sendLast Command To Device", async () => {
        let responseData: any = null;
        let statusCode: any = null;
        const lastCommand = {
          lastCommand: "Hello World",
        };
        await decryptDeviceRequest(req, res, next);
        expect(req.decryptedData).toEqual(reqPlainData);
        expect(req.device).toBeDefined();
        expect(req.device.key).toBe(device.key);
        req = {
          device: { key: device.key, ...lastCommand },
        };

        sendLastCommandToDevice(req, res, next);
        expect(req.response).toBeDefined();

        res = {
          status: mock((code: number) => {
            statusCode = code;
            return res;
          }),
          json: mock((data: any) => {
            responseData = data;
          }),
        };

        encryptResponse(req, res, next);
        expect(statusCode).toBe(200);
        expect(responseData).toBeDefined();

        const decryptedData = decryptRequestData(responseData, device.key);

        expect(decryptedData).toEqual(req.response);
      });
    });
  });
});

describe("API Test", () => {
  Device.findOne = originalDeviceFindOne;

  beforeAll(async () => {
    try {
      await connectDB(DB_URI);
      console.log(`Connected to MongoDB at ${DB_URI}`);
    } catch (error) {
      console.log(`Failed to connect to MongoDB at ${DB_URI}`);
      throw error;
    }
    await Device.deleteMany({});
  });

  afterAll(async () => {
    await Device.deleteMany({});
    console.log("All devices deleted");
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
      console.log("Database Cleared");
    }
    await mongoose.connection.close();
    console.log("Database connection closed");
  });

  const baseDeviceData: Partial<DeviceDoc> = {
    name: "Test Device",
    lastOnline: new Date(),
    lastCommand: null,
    lastLocation: null,
    owner: null,
    currentConfigId: null,
    isNewConfig: false,
    configHistoryIds: [],
    softwareVersion: "1.0.0",
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    updatedBy: null,
    updatedAt: new Date(),
    deviceID: "test-device-123",
    key: "test-key",
  };

  const baseConfigData: Partial<ConfigDoc> = {
    initCommand: {
      deviceCheck: { command: "AT", response: "OK" },
      simCheck: { command: "AT+CPIN?", response: "+CPIN: READY" },
      signalCheck: { command: "AT+CSQ", response: "+CSQ: 20,0" },
      regCheck: { command: "AT+CREG?", response: "+CREG: 0,1" },
      gprsRegCheck: { command: "AT+CGREG?", response: "+CGREG: 0,1" },
      gprsCheck: { command: "AT+CGATT?", response: "+CGATT: 1" },
      operatorCheck: { command: "AT+COPS?", response: '+COPS: 0,0,"INDOSAT"' },
    },
    gpsThreshold: {
      satellite: 5,
      hdop: 2.0,
      distance: 10,
    },
    espConfig: {
      timeInterval: 60,
      GPS: {
        moduleName: "Neo-6M",
        baudRate: 9600,
      },
      SIM: {
        moduleName: "SIM800L",
        baudRate: 115200,
      },
    },
    networkConfig: {
      apn: "internet",
      username: "",
      password: "",
      operator: "INDOSAT",
      rssiThreshold: -85,
      URL: "https://example.com/api/upload",
      key: "abcdef123456",
      phoneNumber: "+6281234567890",
    },
  };

  const generateConfigData = (overrides: Partial<ConfigDoc> = {}): Partial<ConfigDoc> => {
    return {
      ...baseConfigData,
      ...overrides,
    };
  };

  const clean = (obj: object) => JSON.parse(JSON.stringify(obj));

  const generateDeviceData = (overrides: Partial<DeviceDoc> = {}): Partial<DeviceDoc> => {
    return {
      ...baseDeviceData,
      ...overrides,
    };
  };

  const createNewDevice = async (overrides: Partial<DeviceDoc> = {}): Promise<DeviceDoc> => {
    const deviceData = generateDeviceData(overrides);
    const newDevice = new Device(deviceData);
    await newDevice.save();
    return newDevice;
  };

  const createNewConfig = async (overrides: Partial<ConfigDoc> = {}): Promise<ConfigDoc> => {
    const configData = generateConfigData(overrides);
    const newConfig = new Config(configData);
    await newConfig.save();
    return newConfig;
  };

  describe("Sending Config to Device", () => {
    beforeEach(async () => {
      await Device.deleteMany({});
      await Config.deleteMany({});
    });

    it("Should send new config to device", async () => {
      const newKey = generateB64SecretKey();
      const newDevice = await createNewDevice({
        deviceID: "test-device-123",
        key: newKey,
        owner: new mongoose.Types.ObjectId(),
      });

      const newConfig = await createNewConfig();

      if (!newConfig._id || !newDevice._id) {
        throw new Error("Config IDs are not defined");
      }
      newDevice.configHistoryIds.push(newConfig._id);
      newDevice.currentConfigId = newConfig._id;

      newDevice.isNewConfig = true;
      await newDevice.save();

      const response = await supertest(app).get(`${BASE_DEVICE_URL}${newDevice.deviceID}/config`);
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();

      const decryptData = decryptRequestData(response.body, newKey) as ConfigDoc;
      expect(decryptData).toBeDefined();
      if (!decryptData || !decryptData.espConfig || !decryptData.initCommand || !decryptData.gpsThreshold || !decryptData.networkConfig) {
        throw new Error("Decrypted data is undefined");
      }

      expect(clean(decryptData.espConfig)).toEqual(clean(newConfig.espConfig));
      expect(clean(decryptData.initCommand)).toEqual(clean(newConfig.initCommand));
      expect(clean(decryptData.gpsThreshold)).toEqual(clean(newConfig.gpsThreshold));
      expect(clean(decryptData.networkConfig)).toEqual(clean(newConfig.networkConfig));
      const updatedDevice = await Device.findOne({ deviceID: newDevice.deviceID }).lean();
      expect(updatedDevice).toBeDefined();
      expect(updatedDevice && updatedDevice.currentConfigId).toBeDefined();
      expect(updatedDevice && updatedDevice.currentConfigId && updatedDevice.currentConfigId.toString()).toBe(newConfig._id.toString());
      expect(updatedDevice && updatedDevice.isNewConfig).toBe(false);
    });

    it("Should return 404 if device not found", async () => {
      const response = await supertest(app).get(`${BASE_DEVICE_URL}non-existent-device/config`);
      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Device Not Found");
    });

    it("Should return message if device has no new config", async () => {
      const newKey = generateB64SecretKey();
      const newDevice = await createNewDevice({
        deviceID: "test-device-123",
        key: newKey,
        owner: new mongoose.Types.ObjectId(),
        isNewConfig: false,
      });

      const response = await supertest(app).get(`${BASE_DEVICE_URL}${newDevice.deviceID}/config`);
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      const decryptData = decryptRequestData(response.body, newKey);
      expect(decryptData).toBeDefined();
      if (!decryptData || !(decryptData as any).message) {
        throw new Error("Decrypted data is undefined or message is missing");
      }
      expect((decryptData as any).message).toBe("No new configuration available");
      const updatedDevice = await Device.findOne({ deviceID: newDevice.deviceID }).lean();
      expect(updatedDevice).toBeDefined();
      expect(updatedDevice && updatedDevice.isNewConfig).toBe(false);
    });
  });

  it("Should send last command to device", async () => {
    const b64Key = generateB64SecretKey();
    const lastCommand = "AT+CSQ";
    const newDevice = await createNewDevice({
      deviceID: "test-device-123",
      key: b64Key,
      owner: new mongoose.Types.ObjectId(),
    });
    newDevice.lastCommand = lastCommand;

    await newDevice.save();

    const response = await supertest(app).get(`${BASE_DEVICE_URL}${newDevice.deviceID}/command`);
    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    const decryptedData = decryptRequestData(response.body, b64Key);
    expect(decryptedData).toBeDefined();
    if (!decryptedData || !(decryptedData as any).lastCommand) {
      throw new Error("Decrypted data is undefined or lastCommand is missing");
    }
    expect((decryptedData as any).lastCommand).toBe(lastCommand);
    const updatedDevice = await Device.findOne({ deviceID: newDevice.deviceID }).lean();
    expect(updatedDevice).toBeDefined();
    expect(updatedDevice && updatedDevice.lastCommand).toBeNull();
    expect(updatedDevice && updatedDevice.commandHistory).toBeDefined();
    expect(updatedDevice && updatedDevice.commandHistory.length).toBeGreaterThan(0);
    expect(updatedDevice && updatedDevice.commandHistory?.[0]?.command).toBe(lastCommand);
    expect(updatedDevice && updatedDevice.commandHistory?.[0]?.timestamp).toBeDefined();
  });

  describe("Should send Location to DB ", () => {
    const baseLocationData: Partial<LocationDoc> = {
      lat: {
        coord: 10,
        dir: "N",
      },
      lon: {
        coord: 10,
        dir: "N",
      },
      hdop: 1.0,
    };

    const generateLocationData = (overrides: Partial<LocationDoc> = {}): Partial<LocationDoc> => {
      return {
        ...baseLocationData,
        ...overrides,
      };
    };

    beforeAll(async () => {
      await Device.deleteMany({});
      await Config.deleteMany({});
      await Location.deleteMany({});
    });

    beforeEach(async () => {
      await Device.deleteMany({});
      await Config.deleteMany({});
      await Location.deleteMany({});
    });

    afterAll(async () => {
      await Device.deleteMany({});
      await Config.deleteMany({});
      await Location.deleteMany({});
    });

    it("Should send location to DB", async () => {
      const b64Key = generateB64SecretKey();
      const newDevice = await createNewDevice({
        deviceID: "test-device-123",
        key: b64Key,
        owner: new mongoose.Types.ObjectId(),
      });

      if (!newDevice._id || !newDevice.owner) {
        throw new Error("New device ID is not defined");
      }

      const locationData = generateLocationData({
        lat: { coord: 10, dir: "N" },
        lon: { coord: 10, dir: "E" },
        hdop: 1.0,
      });

      const encryptedLocationData = encryptResponseData(locationData, b64Key);

      if (!encryptedLocationData) {
        throw new Error("Encryption failed");
      }

      const response = await supertest(app).post(`${BASE_DEVICE_URL}${newDevice.deviceID}/location`).send(encryptedLocationData).set("Content-Type", "application/json");

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();

      const decryptedData = decryptRequestData(response.body, b64Key);
      expect(decryptedData).toBeDefined();
      if (!decryptedData || !(decryptedData as any).message) {
        throw new Error("Decrypted data is undefined or message is missing");
      }
      expect((decryptedData as any).message).toBe("Location saved successfully");

      const savedLocation = await Location.findOne({ device: newDevice._id }).lean();
      expect(savedLocation).toBeDefined();
      if (!savedLocation) {
        throw new Error("Saved location is null");
      }

      // @ts-ignore
      expect(savedLocation.lat.coord).toBe(locationData.lat && locationData.lat.coord);
      // @ts-ignore
      expect(savedLocation.lon.coord).toBe(locationData.lon && locationData.lon.coord);
      // @ts-ignore
      expect(savedLocation.hdop).toBe(locationData.hdop);
      // @ts-ignore
      expect(savedLocation.lat.dir).toBe(locationData.lat?.dir);
      // @ts-ignore
      expect(savedLocation.lon.dir).toBe(locationData.lon?.dir);
    });

    it("Should Return Error if device has no owner", async () => {
      const newKey = generateB64SecretKey();
      const noOwnerDevice = await createNewDevice({
        owner: null,
        key: newKey,
      });

      const locationData = generateLocationData();
      const encryptedLocationData = encryptResponseData(locationData, newKey);
      if (!encryptedLocationData) {
        throw new Error("Failed To encrypt");
      }

      const response = await supertest(app).post(`${BASE_DEVICE_URL}${noOwnerDevice.deviceID}/location`).send(encryptedLocationData);
      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Device Not Found");
    });
  });

  it("Should check new config", async () => {
    await Device.deleteMany({});
    await Config.deleteMany({});

    const b64Key = generateB64SecretKey();
    const newDevice = await createNewDevice({
      deviceID: "test-device-123",
      key: b64Key,
      owner: new mongoose.Types.ObjectId(),
      isNewConfig: true,
    });

    const newConfig = await createNewConfig();
    if (!newConfig._id || !newDevice._id) {
      throw new Error("Config IDs are not defined");
    }
    newDevice.configHistoryIds.push(newConfig._id);
    newDevice.currentConfigId = newConfig._id;
    newDevice.isNewConfig = false;
    await newDevice.save();
    const response = await supertest(app).get(`${BASE_DEVICE_URL}${newDevice.deviceID}/config/check-new-config`);
    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    const decryptData = decryptRequestData(response.body, b64Key) as ConfigDoc;
    expect(decryptData).toBeDefined();
  });
});
