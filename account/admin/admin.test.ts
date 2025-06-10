import { describe, it, beforeAll, beforeEach, afterAll, expect } from "bun:test";
import dotenv from "dotenv";
import supertest from "supertest";
import app from "../../main/app";
import connectDB from "../../main/database";
import Admin from "./models";
import { type AdminType } from "./models";
import Device, { type DeviceType } from "@/Device/deviceModels";
import mongoose from "mongoose";
import { BlacklistToken, DEFAULT_PROFILE_PIC, ProfilePic } from "../models";
import fs from "fs";
import type { RootType } from "../root/rootModels";
import Root from "../root/rootModels";

dotenv.config({ path: ".test.env" });

const DB_ADDRESS = process.env.DB_ADDRESS || "mongodb://localhost:27017/test";
const DB_PORT = process.env.DB_PORT || "27017";
const DB_URI = `mongodb://${DB_ADDRESS}:${DB_PORT}/?replicaSet=GPS-Tracker-Test`;
console.log("Connecting to MongoDB at:", DB_URI);
const originalConsoleError = console.error;
const BASE_ADMIN_API = "/api/account/admin";
const TEST_IMG_PATH = "/home/muhammad-fadhil-syahputra/GPS/backend/test.jpeg";

beforeAll(() => {
  console.error = (...args) => {
    return;
  };
});

beforeAll(async () => {
  await connectDB(DB_URI).then(() => {
    try {
      console.log(`Connected to MongoDB at ${DB_URI}`);
    } catch (error) {
      console.error("Failed to connect to MongoDB:", error);
    }
  });
  await Admin.deleteMany({});
  await Device.deleteMany({});
});

afterAll(async () => {
  // Close the database connection after all tests
  await Admin.deleteMany({});
  await Device.deleteMany({});
  if (mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
  await mongoose.connection.close();
  await mongoose.disconnect();
  console.log("Database cleared and connection closed.");
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe("Admin Account Tests", () => {
  const baseAdminData = {
    firstName: "John",
    lastName: "Doeasdasdasd",
    email: "john.doe@example.com",
    password: "password123A#",
    username: "johndoe",
  };

  const baseRootData = {
    firstName: process.env.ROOT_FIRST_NAME || "Root",
    lastName: process.env.ROOT_LAST_NAME || "User",
    email: process.env.ROOT_EMAIL || "admin@example.com",
    password: process.env.ROOT_PASSWORD || "rootPassword123A#",
    username: process.env.ROOT_USERNAME || "rootadmin",
    masterkey: process.env.ROOT_MASTER_KEY || "rootMasterKey123",
    roles: "Root",
    AccReq: [],
  };

  if (!baseRootData.firstName || !baseRootData.lastName || !baseRootData.email || !baseRootData.password || !baseRootData.username || !baseRootData.masterkey) {
    throw new Error("Root account environment variables are not set properly.");
  }

  const baseDeviceData: DeviceType = {
    deviceID: "device123",
    name: "Test Device",
    lastOnline: new Date(),
    lastCommand: null,
    lastLocation: null,
    owner: null,
    currentConfigId: null,
    configHistoryIds: [],
    softwareVersion: "1.0.0",
    createdAt: new Date(),
    updatedAt: new Date(),
    commandHistory: [] as any,
  };

  const createDeviceData = (overrides = {}) => ({
    ...baseDeviceData,
    ...overrides,
  });

  const createAdminData = (overrides = {}) => ({
    ...baseAdminData,
    ...overrides,
  });

  describe("Admin Registration and Login", () => {
    beforeEach(async () => {
      await Root.deleteMany({});
      await Admin.deleteMany({});
      await Device.deleteMany({});
      await new Root(baseRootData).save();
    });
    describe("Admin Registration", () => {
      it("Root Account should exist", async () => {
        const root = await Root.findOne({ username: baseRootData.username });
        expect(root).not.toBeNull();
        expect(root?.username).toBe(baseRootData.username);
        expect(root?.email).toBe(baseRootData.email);
        expect(root?.firstName).toBe(baseRootData.firstName);
        expect(root?.lastName).toBe(baseRootData.lastName);
        expect(root?.roles).toBe(baseRootData.roles);
        expect(root?.AccReq).toEqual([]);
        expect(root?.masterkey).toBe(baseRootData.masterkey);
      });

      it("should register a new admin account", async () => {
        const adminData = createAdminData();
        const response = await supertest(app).post(`${BASE_ADMIN_API}/register`).send(adminData);
        expect(response.status).toBe(201);

        expect(response.body).toHaveProperty("message", "Admin account created successfully");

        const admin = await Admin.findOne({ username: adminData.username });

        expect(admin).not.toBeNull();
        expect(admin?.username).toBe(adminData.username);
        expect(admin?.email).toBe(adminData.email);
        expect(admin?.firstName).toBe(adminData.firstName);
        expect(admin?.lastName).toBe(adminData.lastName);
        expect(admin?.roles).toBe("Admin");
        expect(admin?.isAccepted).toBe(false);
      });

      it("Should not register an admin with an existing username", async () => {
        const adminData = createAdminData();
        await supertest(app).post(`${BASE_ADMIN_API}/register`).send(adminData).expect(201);

        const response = await supertest(app).post(`${BASE_ADMIN_API}/register`).send(adminData);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error", "Account already exists");
      });

      it("should return 400 for missing required fields", async () => {
        const response = await supertest(app).post(`${BASE_ADMIN_API}/register`).send({}).expect(400);
        expect(response.body).toHaveProperty("error");
      });

      it("Should not register an admin with invalid password", async () => {
        const adminData = createAdminData({ password: "short" });
        const response = await supertest(app).post(`${BASE_ADMIN_API}/register`).send(adminData);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error", "Password must be at least 8 characters long, Password must contain uppercase, lowercase, and number");
      });

      it("should return 400 for invalid email", async () => {
        const adminData = createAdminData({ email: "invalid-email" });
        const response = await supertest(app).post(`${BASE_ADMIN_API}/register`).send(adminData).expect(400);
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toBe("Invalid email format");
      });

      it("should not register an admin with an existing email", async () => {
        const adminData = createAdminData();
        await supertest(app).post(`${BASE_ADMIN_API}/register`).send(adminData).expect(201);

        const response = await supertest(app).post(`${BASE_ADMIN_API}/register`).send(adminData);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error", "Account already exists");
      });

      it("should not register an admin with invalid username", async () => {
        const adminData = createAdminData({ username: "ab" });
        const response = await supertest(app).post(`${BASE_ADMIN_API}/register`).send(adminData);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error", "Username must be between 3 and 20 characters long");
      });
      it("should not register an admin with invalid first name", async () => {
        const adminData = createAdminData({ firstName: "" });
        const response = await supertest(app).post(`${BASE_ADMIN_API}/register`).send(adminData);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error", "First name is required");
      });
      it("should not register an admin with invalid last name", async () => {
        const adminData = createAdminData({ lastName: "" });
        const response = await supertest(app).post(`${BASE_ADMIN_API}/register`).send(adminData);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error", "Last name is required");
      });
    });

    describe("Admin Login", () => {
      beforeEach(async () => {
        const adminData = createAdminData();
        const response = await supertest(app).post(`${BASE_ADMIN_API}/register`).send(adminData);
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty("message", "Admin account created successfully");
      });

      it("Should login an existing admin", async () => {
        const adminData = createAdminData();
        const response = await supertest(app).post(`${BASE_ADMIN_API}/login`).send(adminData);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("token");
      });

      it("Should not login with invalid credentials", async () => {
        const adminData = createAdminData({ password: "wrongStrongPassword123#" });
        const response = await supertest(app).post(`${BASE_ADMIN_API}/login`).send(adminData);
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty("error", "Invalid email or password");
      });

      it("Should not login with non-existing admin", async () => {
        const adminData = createAdminData({ username: "nonexistingadmin" });
        const response = await supertest(app).post(`${BASE_ADMIN_API}/login`).send(adminData);
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty("error", "Invalid email or password");
      });
    });
  });
});
