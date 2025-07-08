import { describe, it, beforeAll, beforeEach, afterAll, expect } from "bun:test";
import dotenv from "dotenv";
import supertest from "supertest";
import app from "../main/app";
import connectDB from "../main/database";
import Admin from "@/model/admin";
import Device from "@/model/device";
import mongoose from "mongoose";
import fs from "fs";
import { DEFAULT_PROFILE_PIC, TEST_IMAGE_PATH as img } from "@/constants";
import Root from "@/model/root";
import type { AdminDoc, DeviceType } from "@/types/types";
import BlacklistToken from "@/model/blackListToken";
import ProfilePic from "@/model/profilePic";

dotenv.config({ path: "/home/muhammad-fadhil-syahputra/GPS/backend/.test.env" });

const DB_ADDRESS = process.env.DB_ADDRESS_TEST || "mongodb://localhost:27017/test";
const DB_PORT = process.env.DB_PORT_TEST || "27017";
const REPLICA_SET = process.env.REPLICA_SET_TEST || "rs0";
const DB_URI = `mongodb://${DB_ADDRESS}:${DB_PORT}/?replicaSet=${REPLICA_SET}`;
console.log("Connecting to MongoDB at:", DB_URI);
const originalConsoleError = console.error;
const BASE_ADMIN_API = "/api/account/admin";
const TEST_IMG_PATH = img;

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
    isDeleted: false,
    isNewConfig: false,
    key: "test-device-key",
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
    describe("Admin Registration", () => {
      beforeEach(async () => {
        await Root.deleteMany({});
        await Admin.deleteMany({});
        await Device.deleteMany({});
        await new Root(baseRootData).save();
      });
      it("should connect to the database", async () => {
        const isConnected = mongoose.connection.readyState === 1;
        expect(isConnected).toBe(true);
      });
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
        console.log("from it test", baseRootData.username);
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
        await Root.deleteMany({});
        await Admin.deleteMany({});
        await Device.deleteMany({});
        await new Root(baseRootData).save();
      });
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

      it("Should not login with invalid email format", async () => {
        const adminData = createAdminData({ email: "invalid-email" });
        const response = await supertest(app).post(`${BASE_ADMIN_API}/login`).send(adminData);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error", "Invalid email format");
      });

      it("Should not login with invalid password format", async () => {
        const adminData = createAdminData({ password: "short" });
        const response = await supertest(app).post(`${BASE_ADMIN_API}/login`).send(adminData);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error", "Password must be at least 8 characters long, Password must contain uppercase, lowercase, and number");
      });

      it("Should not login with invalid username format", async () => {
        const adminData = createAdminData({ username: "ab" });
        const response = await supertest(app).post(`${BASE_ADMIN_API}/login`).send(adminData);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error", "Username must be between 3 and 20 characters long");
      });

      it("Should not login with missing required fields", async () => {
        const response = await supertest(app).post(`${BASE_ADMIN_API}/login`).send({}).expect(400);
        expect(response.body).toHaveProperty("error");
      });

      it("Should not login with empty credentials", async () => {
        const response = await supertest(app).post(`${BASE_ADMIN_API}/login`).send({ username: "", password: "" }).expect(400);
        expect(response.body).toHaveProperty("error");
      });
    });

    describe("Admin Account Management", () => {
      let adminToken: string;
      let adminAccount: AdminDoc;

      beforeEach(async () => {
        await Admin.deleteMany({});
        await Device.deleteMany({});
        await BlacklistToken.deleteMany({});
        await ProfilePic.deleteMany({});
        await Root.deleteMany({});
        await new Root(baseRootData).save();

        const root = await Root.findOne({ username: baseRootData.username });
        expect(root).not.toBeNull();
        expect(root?.username).toBe(baseRootData.username);
        expect(root?.email).toBe(baseRootData.email);
        expect(root?.firstName).toBe(baseRootData.firstName);

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

        const loginResponse = await supertest(app).post(`${BASE_ADMIN_API}/login`).send({ username: adminData.username, password: adminData.password, email: adminData.email });

        expect(loginResponse.status).toBe(200);
        expect(loginResponse.body).toHaveProperty("token");
        expect(loginResponse.body.token).toBeDefined();
        adminToken = loginResponse.body.token;
        adminAccount = admin as AdminDoc;
      });

      it("should get admin account details", async () => {
        const response = await supertest(app).get(`${BASE_ADMIN_API}`).set("Authorization", `Bearer ${adminToken}`);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("username", baseAdminData.username);
        expect(response.body).toHaveProperty("email", baseAdminData.email);
        expect(response.body).toHaveProperty("firstName", baseAdminData.firstName);
        expect(response.body).toHaveProperty("lastName", baseAdminData.lastName);
        expect(response.body).toHaveProperty("roles", "Admin");
      });

      it("should update admin account details", async () => {
        const updatedData = { firstName: "Jane", lastName: "Doe", email: "jane.doe@example.com", username: "janedoe" };
        const response = await supertest(app).put(`${BASE_ADMIN_API}`).set("Authorization", `Bearer ${adminToken}`).send(updatedData);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("message", "Admin account updated successfully");
        const updatedAdmin = await Admin.findOne({ username: updatedData.username });
        expect(updatedAdmin?.updatedBy?.toString()).toEqual(adminAccount._id.toString());
      });

      it("Should update admin account details even with same username as long as its in the same account", async () => {
        const updatedData = createAdminData();
        const response = await supertest(app).put(`${BASE_ADMIN_API}`).set("Authorization", `Bearer ${adminToken}`).send(updatedData);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("message", "Admin account updated successfully");
      });

      it("should not update admin account with invalid email", async () => {
        const updatedData = { email: "invalid-email" };
        const response = await supertest(app).put(`${BASE_ADMIN_API}`).set("Authorization", `Bearer ${adminToken}`).send(updatedData);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error", "Invalid email format");
      });

      it("should not update admin account with invalid password", async () => {
        const updatedData = { password: "short" };
        const response = await supertest(app).put(`${BASE_ADMIN_API}`).set("Authorization", `Bearer ${adminToken}`).send(updatedData);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error", "Password must be at least 8 characters long, Password must contain uppercase, lowercase, and number");
      });

      it("should not update admin account with invalid username", async () => {
        const updatedData = { username: "ab" };
        const response = await supertest(app).put(`${BASE_ADMIN_API}`).set("Authorization", `Bearer ${adminToken}`).send(updatedData);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error", "Username must be between 3 and 20 characters long");
      });

      it("should not update admin account with missing required fields", async () => {
        const response = await supertest(app).put(`${BASE_ADMIN_API}/`).set("Authorization", `Bearer ${adminToken}`).send({}).expect(400);
        expect(response.body).toHaveProperty("error");
      });

      it("Should delete admin account", async () => {
        const response = await supertest(app).delete(`${BASE_ADMIN_API}`).set("Authorization", `Bearer ${adminToken}`);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("message", "Admin account deleted successfully");
        const deletedAdmin = await Admin.findOne({ username: baseAdminData.username });
        expect(deletedAdmin).toHaveProperty("isDeleted", true);
        expect(deletedAdmin).toHaveProperty("deletedAt");
        expect(deletedAdmin).toHaveProperty("deletedBy", adminAccount._id);
        expect(deletedAdmin).toHaveProperty("updatedAt");
        expect(deletedAdmin).toHaveProperty("updatedBy", adminAccount._id);
      });

      it("Should Blacklist admin token", async () => {
        const response = await supertest(app).get(`${BASE_ADMIN_API}/logout`).set("Authorization", `Bearer ${adminToken}`);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("message", "Account logged out successfully");

        const blacklistedToken = await BlacklistToken.findOne({ token: adminToken });
        expect(blacklistedToken).not.toBeNull();
        expect(blacklistedToken?.token).toBe(adminToken);
      });

      it("Should only allow access to authenticated admin", async () => {
        const response = await supertest(app).get(`${BASE_ADMIN_API}`);
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty("error", "No token provided");
      });

      it("Blacklisted token should not allow access to admin account", async () => {
        const response = await supertest(app).get(`${BASE_ADMIN_API}/logout`).set("Authorization", `Bearer ${adminToken}`);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("message", "Account logged out successfully");

        const relogin = await supertest(app).get(`${BASE_ADMIN_API}/`).set("Authorization", `Bearer ${adminToken}`);
        expect(relogin.status).toBe(401);
        expect(relogin.body).toHaveProperty("error", "Token has expired");
      });

      it("Should not allow access other admin account", async () => {
        const otherAdminData = createAdminData({ username: "otheradmin", email: "fadhil@lolon.com", password: "otheradmin123A#" });
        const otherAdminRegister = await supertest(app).post(`${BASE_ADMIN_API}/register`).send(otherAdminData);
        expect(otherAdminRegister.status).toBe(201);
        expect(otherAdminRegister.body).toHaveProperty("message", "Admin account created successfully");

        const otherAdminLogin = await supertest(app).post(`${BASE_ADMIN_API}/login`).send({ username: otherAdminData.username, password: otherAdminData.password, email: otherAdminData.email });
        expect(otherAdminLogin.status).toBe(200);
        expect(otherAdminLogin.body).toHaveProperty("token");

        const otherAdminToken = otherAdminLogin.body.token;
        const response = await supertest(app).get(`${BASE_ADMIN_API}/`).set("Authorization", `Bearer ${otherAdminToken}`);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("username", otherAdminData.username);
        expect(response.body).toHaveProperty("email", otherAdminData.email);
        expect(response.body).toHaveProperty("firstName", otherAdminData.firstName);
        expect(response.body).toHaveProperty("lastName", otherAdminData.lastName);
        expect(response.body).toHaveProperty("roles", "Admin");
        expect(response.body).not.toHaveProperty("username", baseAdminData.username);
        expect(response.body).not.toHaveProperty("email", baseAdminData.email);
      });

      it("Should not allow access to admin account with invalid token", async () => {
        const response = await supertest(app).get(`${BASE_ADMIN_API}`).set("Authorization", `Bearer invalidToken`);
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty("error", "Invalid token");
      });

      it("Should have default profile picture", async () => {
        const admin = await Admin.findOne({ username: baseAdminData.username }).populate("profilePic");
        expect(admin).not.toBeNull();
        expect((admin?.profilePic as any).pathFile).toBe(DEFAULT_PROFILE_PIC);
      });

      it("Should save the owner in profile picture", async () => {
        const profilePic = await ProfilePic.findOne({ owner: adminAccount._id });
        expect(profilePic).not.toBeNull();
        expect(profilePic?.owner).toEqual(adminAccount._id);
      });

      it("Should update profile picture", async () => {
        const imagePath = TEST_IMG_PATH;
        const response = await supertest(app).put(`${BASE_ADMIN_API}/profile-pic`).set("Authorization", `Bearer ${adminToken}`).attach("profilePic", imagePath);
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty("message", "Profile picture uploaded successfully");
        const updatedAdmin = await Admin.findOne({ username: baseAdminData.username }).populate("profilePic");
        expect(updatedAdmin).not.toBeNull();
        expect((updatedAdmin?.profilePic as any).pathFile).not.toBe(DEFAULT_PROFILE_PIC);
        expect(fs.existsSync((updatedAdmin?.profilePic as any).pathFile)).toBe(true);
        fs.unlinkSync((updatedAdmin?.profilePic as any).pathFile);
      });

      it("Should not update profile picture with invalid file type", async () => {
        const response = await supertest(app).put(`${BASE_ADMIN_API}/profile-pic`).set("Authorization", `Bearer ${adminToken}`).attach("profilePic", "test.txt");
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error", "Invalid file type. Only JPEG, PNG, and GIF are allowed.");
      });

      it("Should delete profile picture", async () => {
        const imagePath = TEST_IMG_PATH;
        const uploadResponse = await supertest(app).put(`${BASE_ADMIN_API}/profile-pic`).set("Authorization", `Bearer ${adminToken}`).attach("profilePic", imagePath);
        expect(uploadResponse.status).toBe(201);
        expect(uploadResponse.body).toHaveProperty("message", "Profile picture uploaded successfully");
        const deleteResponse = await supertest(app).delete(`${BASE_ADMIN_API}/profile-pic`).set("Authorization", `Bearer ${adminToken}`);
        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body).toHaveProperty("message", "Profile picture deleted successfully");
        const updatedAdmin = await Admin.findOne({ username: baseAdminData.username }).populate("profilePic");
        expect(updatedAdmin).not.toBeNull();
        expect((updatedAdmin?.profilePic as any).pathFile).toBe(DEFAULT_PROFILE_PIC);
        expect(fs.existsSync((updatedAdmin?.profilePic as any).pathFile)).toBe(true);
      });

      it("Should not allow profile picture deletion if no profile picture exists", async () => {
        const response = await supertest(app).delete(`${BASE_ADMIN_API}/profile-pic`).set("Authorization", `Bearer ${adminToken}`);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error", "Failed to delete profile picture");
      });

      it("Should not allow profile picture update if no file is provided", async () => {
        const response = await supertest(app).put(`${BASE_ADMIN_API}/profile-pic`).set("Authorization", `Bearer ${adminToken}`);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error", "Profile picture is required");
      });
    });

    describe("Admin Root Interaction", () => {
      let adminToken: string;
      let adminAccount: AdminDoc;
    });
  });
});
