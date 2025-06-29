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
import type { AdminType, DeviceType, RootType } from "@/types/types";
import BlacklistToken from "@/model/blackListToken";
import ProfilePic from "@/model/profilePic";
import Account from "@/model/account";
import User from "@/model/User";
import { type UserType } from "@/types/types";
import { nanoid } from "nanoid";
import { generateB64SecretKey } from "@/service/device";

dotenv.config({ path: "/home/muhammad-fadhil-syahputra/GPS/backend/.test.env" });

const DB_ADDRESS = process.env.DB_ADDRESS_TEST || "mongodb://localhost:27017/test";
const DB_PORT = process.env.DB_PORT_TEST || "27017";
const REPLICA_SET = process.env.REPLICA_SET_TEST || "rs0";
const DB_URI = `mongodb://${DB_ADDRESS}:${DB_PORT}/?replicaSet=${REPLICA_SET}`;
const originalConsoleError = console.error;
const BASE_ROOT_API = "/api/account/root";
const BASE_ADMIN_API = "/api/account/admin";
const BASE_USER_API = "/api/account/user";
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
});

afterAll(async () => {
  console.log("Hallo dunia");
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

describe("Root Account Tests", () => {
  const baseRootData: Partial<RootType> = {
    username: process.env.ROOT_USERNAME || "rootUser",
    password: process.env.ROOT_PASSWORD || "RootPassword123#",
    email: process.env.ROOT_EMAIL || "root@example.com",
    firstName: process.env.ROOT_FIRST_NAME || "Root",
    lastName: process.env.ROOT_LAST_NAME || "User",
    masterkey: process.env.ROOT_MASTER_KEY || "RootMasterKey123#",
  };

  const baseAdminData = {
    firstName: "John",
    lastName: "Doeasdasdasd",
    email: "john.doe@example.com",
    password: "password123A#",
    username: "johndoe",
  };

  const baseUserData: Partial<UserType> = {
    firstName: "JaneUser",
    lastName: "DoeUser",
    email: "jane.doeUser@example.com",
    password: "UserPassword123#",
    username: "janedoeUser",
    devices: [],
  };

  const baseDeviceData: Partial<DeviceType> = {
    name: "Test Device",
    deviceID: nanoid(10),
    key: generateB64SecretKey(),
  };

  const createDeviceData = (overrides: Partial<DeviceType> = {}): Partial<DeviceType> => {
    return {
      ...baseDeviceData,
      ...overrides,
    };
  };

  const createUserData = (overrides: Partial<UserType> = {}): Partial<UserType> => {
    return {
      ...baseUserData,
      ...overrides,
    };
  };

  const createRootData = (overrides: Partial<RootType> = {}): Partial<RootType> => {
    return {
      ...baseRootData,
      ...overrides,
    };
  };

  const createAdminData = (overrides = {}) => ({
    ...baseAdminData,
    ...overrides,
  });

  describe("Root Registration", () => {
    beforeEach(async () => {
      await Root.deleteMany({});
      await ProfilePic.deleteMany({});
      await BlacklistToken.deleteMany({});
      console.log("Root collection cleared before each test.");
    });

    it("Should register a new Root account", async () => {
      const rootData = createRootData();
      const response = await supertest(app).post(`${BASE_ROOT_API}/register`).send(rootData);
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("message", "Root account created successfully");

      const root = await Root.findOne({ username: rootData.username });
      const profilePic = await ProfilePic.findById(root?.profilePic);

      expect(root).toBeDefined();
      expect(root?.username).toBe(rootData.username as any);
      expect(root?.email).toBe(rootData.email as any);
      expect(root?.firstName).toBe(rootData.firstName as any);
      expect(root?.lastName).toBe(rootData.lastName as any);
      expect(root?.roles).toBe("Root");
      expect(root?.masterkey).toBe(rootData.masterkey as any);
      expect(root?.profilePic?.toString()).toBe(profilePic?._id.toString() as any);

      expect(profilePic).toBeDefined();
      expect(profilePic?.owner.toString()).toBe(root!._id.toString());
      expect(profilePic?.pathFile).toBe(DEFAULT_PROFILE_PIC);
    });

    it("Should not register a Root account with an existing username", async () => {
      const rootData = createRootData();
      const response = await supertest(app).post(`${BASE_ROOT_API}/register`).send(rootData);

      expect(response.status).toBe(201);

      expect(response.body).toHaveProperty("message", "Root account created successfully");
      const existingRoot = await Root.findOne({ username: rootData.username });
      expect(existingRoot).toBeDefined();
      expect(existingRoot?.username).toBe(rootData.username as any);
      expect(existingRoot?.email).toBe(rootData.email as any);
      expect(existingRoot?.firstName).toBe(rootData.firstName as any);
      expect(existingRoot?.lastName).toBe(rootData.lastName as any);
      expect(existingRoot?.roles).toBe("Root");
      expect(existingRoot?.masterkey).toBe(rootData.masterkey as any);
      expect(existingRoot?.profilePic).toBeDefined();

      const anotherRootData = createRootData({ email: "anotherRootEmail@gmail.com" });
      const anotherResponse = await supertest(app).post(`${BASE_ROOT_API}/register`).send(anotherRootData);
      expect(anotherResponse.status).toBe(400);
      expect(anotherResponse.body).toHaveProperty("error", "Account already exists");
    });

    it("Should not register a Root account with an existing email", async () => {
      const rootData = createRootData();
      const response = await supertest(app).post(`${BASE_ROOT_API}/register`).send(rootData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("message", "Root account created successfully");

      const existingRoot = await Root.findOne({ email: rootData.email });
      expect(existingRoot).toBeDefined();
      expect(existingRoot?.username).toBe(rootData.username as any);
      expect(existingRoot?.email).toBe(rootData.email as any);
      expect(existingRoot?.firstName).toBe(rootData.firstName as any);
      expect(existingRoot?.lastName).toBe(rootData.lastName as any);
      expect(existingRoot?.roles).toBe("Root");
      expect(existingRoot?.masterkey).toBe(rootData.masterkey as any);
      expect(existingRoot?.profilePic).toBeDefined();

      const anotherRootData = createRootData({ username: "anotherRootUser" });
      const anotherResponse = await supertest(app).post(`${BASE_ROOT_API}/register`).send(anotherRootData);
      expect(anotherResponse.status).toBe(400);
      expect(anotherResponse.body).toHaveProperty("error", "Account already exists");
    });

    it("Should return 400 for missing required fields", async () => {
      const response = await supertest(app).post(`${BASE_ROOT_API}/register`).send({});
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("Should return 400 for invalid email format", async () => {
      const invalidEmailData = createRootData({ email: "invalidEmail" });
      const response = await supertest(app).post(`${BASE_ROOT_API}/register`).send(invalidEmailData);
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Invalid email format");
    });

    it("Should return 400 for weak password", async () => {
      const weakPasswordData = createRootData({ password: "weak" });
      const response = await supertest(app).post(`${BASE_ROOT_API}/register`).send(weakPasswordData);
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Password must be at least 8 characters long, Password must contain uppercase, lowercase, and number");
    });

    it("Should not register a Root account with invalid username", async () => {
      const invalidUsernameData = createRootData({ username: "" });
      const response = await supertest(app).post(`${BASE_ROOT_API}/register`).send(invalidUsernameData);
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("Should not register a Root account with invalid last name", async () => {
      const invalidLastNameData = createRootData({ lastName: "" });
      const response = await supertest(app).post(`${BASE_ROOT_API}/register`).send(invalidLastNameData);
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("Should not register with same masterkey", async () => {
      const baseRootData = createRootData();
      const anotherRootData = createRootData({
        username: "anotherRootUser",
        email: "anotherRootData@gmail.com",
      });

      const baseRootRegister = await supertest(app).post(`${BASE_ROOT_API}/register`).send(baseRootData);
      expect(baseRootRegister.status).toBe(201);
      expect(baseRootRegister.body).toHaveProperty("message", "Root account created successfully");
      const anotherRootRegister = await supertest(app).post(`${BASE_ROOT_API}/register`).send(anotherRootData);
      expect(anotherRootRegister.status).toBe(400);
      expect(anotherRootRegister.body).toHaveProperty("error", "Master key already exists");
      const anotherRoot = await Root.findOne({ username: anotherRootData.username });
      expect(anotherRoot).toBeNull();
      const baseRoot = await Root.findOne({ username: baseRootData.username });
      expect(baseRoot).toBeDefined();
      expect(baseRoot?.username).toBe(baseRootData.username as any);
      expect(baseRoot?.email).toBe(baseRootData.email as any);
      expect(baseRoot?.firstName).toBe(baseRootData.firstName as any);
    });
  });

  describe("Root Login", () => {
    beforeEach(async () => {
      await Root.deleteMany({});
      await ProfilePic.deleteMany({});
      await BlacklistToken.deleteMany({});
    });

    beforeEach(async () => {
      const rootData = createRootData();
      const root = new Root(rootData);
      const register = await supertest(app).post(`${BASE_ROOT_API}/register`).send(rootData);
      expect(register.status).toBe(201);
      expect(register.body).toHaveProperty("message", "Root account created successfully");
    });

    it("Should login an existing Root account", async () => {
      const rootData = createRootData();
      const response = await supertest(app).post(`${BASE_ROOT_API}/login`).send({
        username: rootData.username,
        password: rootData.password,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
    });

    it("Should not login with invalid credentials", async () => {
      const rootData = createRootData({
        username: "nonExistentUser",
        password: "WrongPassword123#",
      });

      const response = await supertest(app).post(`${BASE_ROOT_API}/login`).send({
        username: rootData.username,
        password: rootData.password,
      });
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "Account not found");
    });

    it("Should login with email", async () => {
      const rootData = createRootData();
      const response = await supertest(app).post(`${BASE_ROOT_API}/login`).send({
        email: rootData.email,
        password: rootData.password,
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
    });

    it("Should login with username", async () => {
      const rootData = createRootData();
      const response = await supertest(app).post(`${BASE_ROOT_API}/login`).send({
        username: rootData.username,
        password: rootData.password,
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
    });

    it("Should return 400 for missing credentials", async () => {
      const response = await supertest(app).post(`${BASE_ROOT_API}/login`).send({});
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("Should not login with invalid email format", async () => {
      const rootData = createRootData();
      const response = await supertest(app).post(`${BASE_ROOT_API}/login`).send({
        email: "invalidEmail",
        password: rootData.password,
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Invalid email format");
    });

    it("Should not login with weak password", async () => {
      const rootData = createRootData({ password: "weak" });
      const response = await supertest(app).post(`${BASE_ROOT_API}/login`).send({
        username: rootData.username,
        password: rootData.password,
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Password must be at least 8 characters long, Password must contain uppercase, lowercase, and number");
    });
  });

  describe("Root Account Management", () => {
    let rootToken: string;
    let rootAccount: any;

    beforeEach(async () => {
      await Root.deleteMany({});
      await Device.deleteMany({});
      await ProfilePic.deleteMany({});

      const rootData = createRootData();
      const register = await supertest(app).post(`${BASE_ROOT_API}/register`).send(rootData);
      expect(register.status).toBe(201);
      expect(register.body).toHaveProperty("message", "Root account created successfully");

      const login = await supertest(app).post(`${BASE_ROOT_API}/login`).send({
        username: rootData.username,
        password: rootData.password,
      });
      expect(login.status).toBe(200);
      expect(login.body).toHaveProperty("token");
      rootToken = login.body.token;
      const foundRoot = await Account.findOne({ username: rootData.username });
      if (!foundRoot) {
        throw new Error("Root account not found after registration");
      }
      rootAccount = foundRoot as any;
      expect(rootAccount).toBeDefined();
      expect(rootAccount.username).toBe(rootData.username as any);
      expect(rootAccount.email).toBe(rootData.email as any);
      expect(rootAccount.firstName).toBe(rootData.firstName as any);
      expect(rootAccount.lastName).toBe(rootData.lastName as any);
    });

    it("Should get Root account details", async () => {
      const response = await supertest(app).get(`${BASE_ROOT_API}/`).set("Authorization", `Bearer ${rootToken}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("username", rootAccount.username);
      expect(response.body).toHaveProperty("email", rootAccount.email);
      expect(response.body).toHaveProperty("firstName", rootAccount.firstName);
      expect(response.body).toHaveProperty("lastName", rootAccount.lastName);
      expect(response.body).toHaveProperty("roles", "Root");
      expect(response.body).toHaveProperty("AccReq");
      expect(response.body.AccReq).toBeInstanceOf(Array);
      expect(response.body.AccReq.length).toBe(0);
    });

    it("Should update Root account details", async () => {
      const updatedData = {
        firstName: "UpdatedRoot",
        lastName: "User",
        email: "updatedroot@example.com",
        masterkey: "newMasterKey",
      };
      const response = await supertest(app).put(`${BASE_ROOT_API}/`).set("Authorization", `Bearer ${rootToken}`).send(updatedData);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message", "Root account updated successfully");
      const updatedRoot = await Root.findById(rootAccount._id);
      expect(updatedRoot).toBeDefined();
      expect(updatedRoot?.firstName).toBe(updatedData.firstName);
      expect(updatedRoot?.lastName).toBe(updatedData.lastName);
      expect(updatedRoot?.email).toBe(updatedData.email);
      expect(updatedRoot?.updatedAt).toBeDefined();
      expect(updatedRoot && updatedRoot.updatedBy && updatedRoot.updatedBy.toString()).toBe(rootAccount._id.toString());
      expect(updatedRoot?.isDeleted).toBe(false);
    });

    it("Should not update Root account if username already exists", async () => {
      const baseRootData = createRootData();
      const anotherRootData = createRootData({ email: "anotherRootEmail@gmail.com", username: "anotherRootUser", masterkey: "anotherMasterKey" });

      const anotherRootRegister = await supertest(app).post(`${BASE_ROOT_API}/register`).send(anotherRootData);
      expect(anotherRootRegister.status).toBe(201);
      expect(anotherRootRegister.body).toHaveProperty("message", "Root account created successfully");

      const anotherRootLogin = await supertest(app).post(`${BASE_ROOT_API}/login`).send({
        username: anotherRootData.username,
        password: anotherRootData.password,
      });
      expect(anotherRootLogin.status).toBe(200);
      expect(anotherRootLogin.body).toHaveProperty("token");

      const anotherRootToken = anotherRootLogin.body.token;
      const updatedData = {
        username: baseRootData.username,
        email: baseRootData.email,
      };

      const anotherRootUpdate = await supertest(app).put(`${BASE_ROOT_API}/`).set("Authorization", `Bearer ${anotherRootToken}`).send(updatedData);
      expect(anotherRootUpdate.status).toBe(400);
      expect(anotherRootUpdate.body).toHaveProperty("error", "Account already exists");
    });

    it("Should Blacklist Root Token", async () => {
      const logOut = await supertest(app).get(`${BASE_ROOT_API}/logout`).set("Authorization", `Bearer ${rootToken}`);
      expect(logOut.status).toBe(200);
      expect(logOut.body).toHaveProperty("message", "Account logged out successfully");
      const blacklistedToken = await BlacklistToken.findOne({ token: rootToken });
      expect(blacklistedToken).toBeDefined();
      expect(blacklistedToken?.token).toBe(rootToken);
      expect(blacklistedToken?.expiresAt).toBeDefined();
      const response = await supertest(app).get(`${BASE_ROOT_API}/`).set("Authorization", `Bearer ${rootToken}`);
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error", "Token has expired");
    });

    it("Should only allow access to Root account with valid token", async () => {
      const response = await supertest(app).get(`${BASE_ROOT_API}/`).set("Authorization", `Bearer ${rootToken}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("username", rootAccount.username);
      expect(response.body).toHaveProperty("email", rootAccount.email);
      expect(response.body).toHaveProperty("firstName", rootAccount.firstName);
      expect(response.body).toHaveProperty("lastName", rootAccount.lastName);
      expect(response.body).toHaveProperty("roles", "Root");
      expect(response.body).toHaveProperty("AccReq");
      expect(response.body.AccReq).toBeInstanceOf(Array);
      expect(response.body.AccReq.length).toBe(0);
      const invalidTokenResponse = await supertest(app).get(`${BASE_ROOT_API}/`).set("Authorization", `Bearer invalidToken`);
      expect(invalidTokenResponse.status).toBe(401);
      expect(invalidTokenResponse.body).toHaveProperty("error", "Invalid token");
      const expiredToken = "expiredToken";
      const expiredBlacklistToken = new BlacklistToken({
        token: expiredToken,
        expiresAt: new Date(Date.now() - 1000), // Set to past date
      });
      await expiredBlacklistToken.save();
      const expiredResponse = await supertest(app).get(`${BASE_ROOT_API}/`).set("Authorization", `Bearer ${expiredToken}`);
      expect(expiredResponse.status).toBe(401);

      expect(expiredResponse.body).toHaveProperty("error", "Token has expired");
    });

    it("Should only allow access to authenticated Root account", async () => {
      const unauthenticatedResponse = await supertest(app).get(`${BASE_ROOT_API}/`);
      expect(unauthenticatedResponse.status).toBe(401);
      expect(unauthenticatedResponse.body).toHaveProperty("error", "No token provided");
    });

    it("Should have default profile picture", async () => {
      const rootData = createRootData();
      const root = await Root.findOne({ username: rootData.username }).populate("profilePic");
      expect(root).not.toBeNull();
      expect(root?.profilePic).toBeDefined();
      expect((root?.profilePic as any).pathFile).toBe(DEFAULT_PROFILE_PIC);
      expect(fs.existsSync((root?.profilePic as any).pathFile)).toBe(true);
    });

    it("Should save the owner in profile picture", async () => {
      const profilePic = await ProfilePic.findOne({ owner: rootAccount._id });
      expect(profilePic).not.toBeNull();
      expect(profilePic?.owner).toEqual(rootAccount._id);
    });

    it("Should update profile picture", async () => {
      const imagePath = TEST_IMG_PATH;
      const response = await supertest(app).put(`${BASE_ROOT_API}/profile-pic`).set("Authorization", `Bearer ${rootToken}`).attach("profilePic", imagePath);
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("message", "Profile picture uploaded successfully");
      const updatedRoot = await Root.findById(rootAccount._id).populate("profilePic");
      expect(updatedRoot).toBeDefined();
      expect(updatedRoot?.profilePic).toBeDefined();
      expect((updatedRoot?.profilePic as any).pathFile).not.toBe(DEFAULT_PROFILE_PIC);
      expect(fs.existsSync((updatedRoot?.profilePic as any).pathFile)).toBe(true);
      expect((updatedRoot?.profilePic as any).owner.toString()).toBe(rootAccount._id.toString());
      const profilePic = await ProfilePic.findOne({ owner: rootAccount._id });
      expect(profilePic).not.toBeNull();
      expect(profilePic?.owner.toString()).toBe(rootAccount._id.toString());
      expect(profilePic?.pathFile).not.toBe(DEFAULT_PROFILE_PIC);
      expect(fs.existsSync(profilePic?.pathFile as string)).toBe(true);
      fs.unlinkSync(profilePic?.pathFile as string);
    });

    it("Should delete profile picture", async () => {
      const imagePath = TEST_IMG_PATH;

      const uploadResponse = await supertest(app).put(`${BASE_ROOT_API}/profile-pic`).set("Authorization", `Bearer ${rootToken}`).attach("profilePic", imagePath);
      expect(uploadResponse.status).toBe(201);
      expect(uploadResponse.body).toHaveProperty("message", "Profile picture uploaded successfully");

      const updatedRoot = await Root.findById(rootAccount._id).populate("profilePic");
      expect(updatedRoot).toBeDefined();
      expect(updatedRoot?.profilePic).toBeDefined();
      expect((updatedRoot?.profilePic as any).pathFile).not.toBe(DEFAULT_PROFILE_PIC);
      expect(fs.existsSync((updatedRoot?.profilePic as any).pathFile)).toBe(true);

      const oldProfilePicPath = (updatedRoot?.profilePic as any).pathFile;
      expect(fs.existsSync(oldProfilePicPath)).toBe(true);

      const deleteResponse = await supertest(app).delete(`${BASE_ROOT_API}/profile-pic`).set("Authorization", `Bearer ${rootToken}`);
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body).toHaveProperty("message", "Profile picture deleted successfully");
      const deletedProfilePic = await ProfilePic.findOne({ owner: rootAccount._id });
      expect(deletedProfilePic).toHaveProperty("pathFile", DEFAULT_PROFILE_PIC);
      expect(fs.existsSync(DEFAULT_PROFILE_PIC)).toBe(true);

      const rootAfterDelete = await Root.findById(rootAccount._id).populate("profilePic");
      expect(rootAfterDelete).toBeDefined();
      expect(rootAfterDelete?.profilePic).toBeDefined();
      expect((rootAfterDelete?.profilePic as any).pathFile).toBe(DEFAULT_PROFILE_PIC);
      expect(fs.existsSync((rootAfterDelete?.profilePic as any).pathFile)).toBe(true);

      expect(fs.existsSync(oldProfilePicPath)).toBe(false);
    });
  });

  describe("Root Admin Interaction", () => {
    let rootToken: string;
    let rootAccount: Partial<RootType>;
    let adminAccount: Partial<AdminType>;
    let adminToken: string;

    beforeEach(async () => {
      await Root.deleteMany({});
      await Admin.deleteMany({});
      await Device.deleteMany({});
      await ProfilePic.deleteMany({});

      const rootData = createRootData();
      const register = await supertest(app).post(`${BASE_ROOT_API}/register`).send(rootData);
      expect(register.status).toBe(201);
      expect(register.body).toHaveProperty("message", "Root account created successfully");
      const login = await supertest(app).post(`${BASE_ROOT_API}/login`).send({
        username: rootData.username,
        password: rootData.password,
      });
      expect(login.status).toBe(200);
      expect(login.body).toHaveProperty("token");
      rootToken = login.body.token;
      const foundRoot = await Account.findOne({ username: rootData.username }).populate("profilePic");
      if (!foundRoot) {
        throw new Error("Root account not found after registration");
      }
      rootAccount = foundRoot as Partial<RootType>;
      expect(rootAccount).toBeDefined();
      expect(rootAccount.username).toBe(rootData.username as any);
      expect(rootAccount.email).toBe(rootData.email as any);
      expect(rootAccount.firstName).toBe(rootData.firstName as any);
      expect(rootAccount.lastName).toBe(rootData.lastName as any);
      expect(rootAccount.roles).toBe("Root");
      expect(rootAccount.profilePic).toBeDefined();
      expect(fs.existsSync((rootAccount as any).profilePic.pathFile)).toBe(true);
      expect((rootAccount as any).profilePic.pathFile).toBe(DEFAULT_PROFILE_PIC);
      expect((rootAccount as any).profilePic.owner.toString()).toBe((rootAccount as any)._id.toString());

      const adminData = createAdminData();
      const adminRegist = await supertest(app).post(`${BASE_ADMIN_API}/register`).set("Authorization", `Bearer ${rootToken}`).send(adminData);
      expect(adminRegist.status).toBe(201);
      expect(adminRegist.body).toHaveProperty("message", "Admin account created successfully");
      const adminLogin = await supertest(app).post(`${BASE_ADMIN_API}/login`).send({
        username: adminData.username,
        password: adminData.password,
      });
      expect(adminLogin.status).toBe(200);
      expect(adminLogin.body).toHaveProperty("token");
      adminToken = adminLogin.body.token;
      const foundAdmin = await Admin.findOne({ username: adminData.username }).populate("profilePic");
      if (!foundAdmin) {
        throw new Error("Admin account not found after registration");
      }
      adminAccount = foundAdmin as Partial<AdminType>;
      expect(adminAccount).toBeDefined();
      expect(adminAccount.username).toBe(adminData.username as any);
      expect(adminAccount.email).toBe(adminData.email as any);
      expect(adminAccount.firstName).toBe(adminData.firstName as any);
      expect(adminAccount.lastName).toBe(adminData.lastName as any);
      expect(adminAccount.roles).toBe("Admin");
      expect(adminAccount.profilePic).toBeDefined();

      expect(fs.existsSync((adminAccount as any).profilePic.pathFile)).toBe(true);
      expect((adminAccount as any).profilePic.pathFile).toBe(DEFAULT_PROFILE_PIC);
      expect((adminAccount as any).profilePic.owner.toString()).toBe((adminAccount as any)._id.toString());
      expect(adminAccount.isAccepted).toBe(false);
      expect(adminAccount.isDeleted).toBe(false);
    });

    it("Should send admin request to Root", async () => {
      const rootData = createRootData();
      const root = await Root.findOne({ username: rootData.username });
      expect(root).toBeDefined();
      expect(root?.AccReq).toBeDefined();
    });

    it("Should accept admin request by Root", async () => {
      const adminData = createAdminData();
      const rootData = createRootData();
      const acceptResponse = await supertest(app).post(`${BASE_ROOT_API}/admin/${adminData.username}/acc`).set("Authorization", `Bearer ${rootToken}`);

      expect(acceptResponse.status).toBe(200);
      expect(acceptResponse.body).toHaveProperty("message", "Admin request accepted successfully");

      const updatedAdmin = await Admin.findOne({ username: adminData.username }).populate("profilePic");
      expect(updatedAdmin).toBeDefined();
      expect(updatedAdmin?.isAccepted).toBe(true);
      expect(updatedAdmin?.isDeleted).toBe(false);
      expect(updatedAdmin?.profilePic).toBeDefined();
      expect(updatedAdmin?.updatedBy?.toString()).toBe((rootAccount as any)._id.toString());

      const root = await Root.findOne({ username: rootData.username });
      expect(root).toBeDefined();
      expect(root?.AccReq).toBeDefined();
      expect(root?.AccReq.length).toBe(0);
      expect(root?.AccReq).not.toContain(updatedAdmin?._id.toString());
    });

    it("Should return 404 when accepting non-existent admin request", async () => {
      const nonExistentAdminUsername = "nonExistentAdmin";
      const response = await supertest(app).post(`${BASE_ROOT_API}/admin/${nonExistentAdminUsername}/acc`).set("Authorization", `Bearer ${rootToken}`);
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "Account not found");
    });

    it("Should reject admin request by Root", async () => {
      const adminData = createAdminData();
      const rejectResponse = await supertest(app).post(`${BASE_ROOT_API}/admin/${adminData.username}/reject`).set("Authorization", `Bearer ${rootToken}`);
      expect(rejectResponse.status).toBe(200);
      expect(rejectResponse.body).toHaveProperty("message", "Admin request rejected successfully");
      const updatedAdmin = await Admin.findOne({ username: adminData.username }).populate("profilePic");
      expect(updatedAdmin).toBeDefined();
      expect(updatedAdmin?.isAccepted).toBe(false);
      expect(updatedAdmin?.isDeleted).toBe(true);
      expect(updatedAdmin?.profilePic).toBeDefined();
    });

    it("Should return 404 when rejecting non-existent admin request", async () => {
      const nonExistentAdminUsername = "nonExistentAdmin";
      const response = await supertest(app).post(`${BASE_ROOT_API}/admin/${nonExistentAdminUsername}/reject`).set("Authorization", `Bearer ${rootToken}`);
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "Account not found");
    });

    it("Should get admin account details", async () => {
      const adminData = createAdminData();
      const response = await supertest(app).get(`${BASE_ROOT_API}/admin/${adminData.username}`).set("Authorization", `Bearer ${rootToken}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("username", adminAccount.username);
      expect(response.body).toHaveProperty("email", adminAccount.email);
      expect(response.body).toHaveProperty("firstName", adminAccount.firstName);
      expect(response.body).toHaveProperty("lastName", adminAccount.lastName);
      expect(response.body).toHaveProperty("roles", "Admin");
      expect(response.body).toHaveProperty("isAccepted", adminAccount.isAccepted);
    });

    it("Should return 404 when getting non-existent admin account details", async () => {
      const nonExistentAdminUsername = "nonExistentAdmin";
      const response = await supertest(app).get(`${BASE_ROOT_API}/admin/${nonExistentAdminUsername}`).set("Authorization", `Bearer ${rootToken}`);
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "Account not found");
    });

    it("Should update admin account", async () => {
      const updatedAdminData = {
        firstName: "UpdatedAdmin",
        lastName: "lastName Of Admin",
        email: "first.updated@example.com",
        username: "updatedAdminUsername",
      };

      const oldAdminData = createAdminData();
      const oldAdminInsideDb = await Admin.findOne({ username: oldAdminData.username });
      expect(oldAdminInsideDb).toBeDefined();
      expect(oldAdminInsideDb?.username).toBe(oldAdminData.username as any);
      expect(oldAdminInsideDb?.email).toBe(oldAdminData.email as any);
      expect(oldAdminInsideDb?.firstName).toBe(oldAdminData.firstName as any);
      expect(oldAdminInsideDb?.lastName).toBe(oldAdminData.lastName as any);
      expect(oldAdminInsideDb?.roles).toBe("Admin");

      const response = await supertest(app).put(`${BASE_ROOT_API}/admin/${adminAccount.username}`).set("Authorization", `Bearer ${rootToken}`).send(updatedAdminData);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message", "Admin account updated successfully");

      const updatedAdmin = await Admin.findOne({ username: updatedAdminData.username }).populate("profilePic");
      expect(updatedAdmin).toBeDefined();
      expect(updatedAdmin?.firstName).toBe(updatedAdminData.firstName);
      expect(updatedAdmin?.lastName).toBe(updatedAdminData.lastName);
      expect(updatedAdmin?.email).toBe(updatedAdminData.email);
      expect(updatedAdmin?.username).toBe(updatedAdminData.username);
      expect(updatedAdmin?.updatedAt).toBeDefined();
      expect(updatedAdmin?.updatedBy?.toString()).toBe((rootAccount as any)._id.toString());
      expect(updatedAdmin?.isDeleted).toBe(false);
    });

    it("Should Delete an Admin account", async () => {
      const deleteResponse = await supertest(app).delete(`${BASE_ROOT_API}/admin/${adminAccount.username}`).set("Authorization", `Bearer ${rootToken}`);
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body).toHaveProperty("message", "Admin account deleted successfully");
      const deletedAdmin = await Admin.findOne({ username: adminAccount.username });
      expect(deletedAdmin).toBeDefined();
      expect(deletedAdmin?.isDeleted).toBe(true);
      const root = await Root.findOne({ username: rootAccount.username });
      expect(root).toBeDefined();
      expect(root?.AccReq).toBeDefined();
      expect(root?.AccReq.length).toBe(0);
    });

    it("Should return an admin account information", async () => {
      const response = await supertest(app).get(`${BASE_ROOT_API}/admin/${adminAccount.username}`).set("Authorization", `Bearer ${rootToken}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("username", adminAccount.username);
      expect(response.body).toHaveProperty("email", adminAccount.email);
      expect(response.body).toHaveProperty("firstName", adminAccount.firstName);
      expect(response.body).toHaveProperty("lastName", adminAccount.lastName);
      expect(response.body).toHaveProperty("roles", "Admin");
      expect(response.body).toHaveProperty("isAccepted", adminAccount.isAccepted);
    });

    it("Should return 404 when getting non-existent admin account information", async () => {
      const nonExistentAdminUsername = "nonExistentAdmin";
      const response = await supertest(app).get(`${BASE_ROOT_API}/admin/${nonExistentAdminUsername}`).set("Authorization", `Bearer ${rootToken}`);
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "Account not found");
    });
  });

  describe("Root User Interaction", () => {
    let rootToken: string;
    let rootAccount: Partial<RootType> | null;
    let userAccount: Partial<UserType> | null;
    let userToken: string;
    let devicesIDs: string[] = [];
    let devicesData: Partial<DeviceType>[] = [];

    beforeEach(async () => {
      await Root.deleteMany({});
      await User.deleteMany({});
      await Device.deleteMany({});

      for (let i = 0; i < 10; i++) {
        const deviceData = createDeviceData({
          deviceID: nanoid(10),
        });
        devicesIDs.push(deviceData.deviceID as string);
        devicesData.push(deviceData);
      }

      await Device.insertMany(devicesData);

      const rootData = createRootData();
      const registerRoot = await supertest(app).post(`${BASE_ROOT_API}/register`).send(rootData);
      expect(registerRoot.status).toBe(201);
      rootAccount = await Root.findOne({ username: rootData.username });
      expect(rootAccount).toBeDefined();
      expect(rootAccount?.username).toBe(rootData.username as any);
      expect(rootAccount?.email).toBe(rootData.email as any);
      expect(rootAccount?.firstName).toBe(rootData.firstName as any);

      const userData = createUserData();
      const registerUser = await supertest(app).post(`${BASE_USER_API}/register`).send(userData);
      expect(registerUser.status).toBe(201);

      userAccount = await User.findOne<Partial<UserType>>({ username: userData.username });
      expect(userAccount).toBeDefined();
      expect(userAccount?.username).toBe(userData.username as any);
      expect(userAccount?.email?.toLocaleLowerCase()).toBe(userData.email?.toLocaleLowerCase() as any);

      await Device.updateMany({ deviceID: { $in: devicesData.map((device) => device.deviceID) } }, { $set: { owner: userAccount?._id } });
      const devices = await Device.find({ deviceID: { $in: devicesData.map((device) => device.deviceID) } });
      const deviceObjId = devices.map((device) => device._id);
      if (userAccount) {
        userAccount.devices = deviceObjId;
        await (userAccount as any).save();
      }

      const loginRoot = await supertest(app).post(`${BASE_ROOT_API}/login`).send({
        username: rootData.username,
        password: rootData.password,
      });

      expect(loginRoot.status).toBe(200);
      expect(loginRoot.body).toHaveProperty("token");
      rootToken = loginRoot.body.token;

      const loginUser = await supertest(app).post(`${BASE_USER_API}/login`).send({
        username: userData.username,
        password: userData.password,
      });
      expect(loginUser.status).toBe(200);
      expect(loginUser.body).toHaveProperty("token");
      userToken = loginUser.body.token;
    });

    it("Should get user account details", async () => {
      const response = await supertest(app).get(`${BASE_ROOT_API}/user/${userAccount?.username}`).set("Authorization", `Bearer ${rootToken}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("username", userAccount?.username);
      expect(response.body).toHaveProperty("email", userAccount?.email);
      expect(response.body).toHaveProperty("firstName", userAccount?.firstName);
      expect(response.body).toHaveProperty("lastName", userAccount?.lastName);
      expect(response.body).toHaveProperty("roles", "User");
    });

    it("Should return 404 when getting non-existent user account details", async () => {
      const nonExistentUserUsername = "nonExistentUser";
      const response = await supertest(app).get(`${BASE_ROOT_API}/user/${nonExistentUserUsername}`).set("Authorization", `Bearer ${rootToken}`);
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "Account not found");
    });

    it("Should return error when trying to get user account details without authorization", async () => {
      const response = await supertest(app).get(`${BASE_ROOT_API}/user/${userAccount?.username}`);
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error", "No token provided");
    });

    it("Should return error if username or password is invalid", async () => {
      const response = await supertest(app).get(`${BASE_ROOT_API}/user/in`).set("Authorization", `Bearer ${rootToken}`);
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Username must be between 3 and 20 characters long");
    });

    it("Should update user account details", async () => {
      const updatedUserData = {
        firstName: "UpdatedUser",
        lastName: "UpdatedLastName",
        email: "updated.jane.doeUser@example.com",
        password: "UpdatedUserPassword123#",
        username: "updatedjanedoeUser",
      };

      const oldUser = await User.findOne({ username: userAccount?.username });
      expect(oldUser).toBeDefined();
      expect(oldUser?.username).toBe(userAccount?.username as any);
      expect(oldUser?.email.toLowerCase()).toBe(userAccount?.email as any);

      const response = await supertest(app).put(`${BASE_ROOT_API}/user/${userAccount?.username}`).set("Authorization", `Bearer ${rootToken}`).send(updatedUserData);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message", "User updated successfully. 0 devices added. All provided device IDs were valid.");

      const updatedUser = await User.findOne({ username: updatedUserData.username }).populate("profilePic");
      expect(updatedUser).toBeDefined();
      expect(updatedUser?.firstName).toBe(updatedUserData.firstName);
      expect(updatedUser?.lastName).toBe(updatedUserData.lastName);
      expect(updatedUser?.email?.toLocaleLowerCase()).toBe(updatedUserData.email?.toLocaleLowerCase());
      expect(updatedUser?.username).toBe(updatedUserData.username);
      expect(updatedUser?.updatedAt).toBeDefined();
      expect(updatedUser?.updatedBy?.toString()).toBe((rootAccount as any)._id.toString());
      expect(updatedUser?.isDeleted).toBe(false);
    });

    it("Should not update user account if username already exists", async () => {
      const anotherUserData = createUserData({ email: "anotherUserEmail@gmail.com", username: "anotherUser" });

      const anotherUserRegister = await supertest(app).post(`${BASE_USER_API}/register`).send(anotherUserData);
      expect(anotherUserRegister.status).toBe(201);

      const anotherUser = await User.findOne({ username: anotherUserData.username });
      expect(anotherUser).toBeDefined();

      const updatedUserData = {
        username: anotherUserData.username,
        email: "justdifferentemail@gmail.com",
      };

      const response = await supertest(app).put(`${BASE_ROOT_API}/user/${userAccount?.username}`).set("Authorization", `Bearer ${rootToken}`).send(updatedUserData);
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Account already exists");
    });

    it("Should add new devices to user account", async () => {
      const newDeviceData = createDeviceData({
        deviceID: nanoid(10),
      });

      const newDevice = new Device(newDeviceData);
      await newDevice.save();

      const oldUser = await User.findOne({ username: userAccount?.username });
      expect(oldUser).toBeDefined();
      expect(oldUser?.devices.length).toBeGreaterThan(0);

      const oldDeviceCount = oldUser?.devices.length || 0;

      const response = await supertest(app)
        .put(`${BASE_ROOT_API}/user/${userAccount?.username}`)
        .set("Authorization", `Bearer ${rootToken}`)
        .send({
          devices: [newDeviceData.deviceID],
        });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message", "User updated successfully. 1 device added. All provided device IDs were valid.");

      const user = await User.findOne({ username: userAccount?.username });
      expect(user).toBeDefined();
      expect(user?.devices.length).toBe(oldDeviceCount + 1);
      expect(user?.devices).toContainEqual(newDevice._id);
    });

    it("Should not add devices with invalid IDs", async () => {
      const invalidDeviceID = "invalidDeviceID123";
      const response = await supertest(app)
        .put(`${BASE_ROOT_API}/user/${userAccount?.username}`)
        .set("Authorization", `Bearer ${rootToken}`)
        .send({
          devices: [invalidDeviceID],
        });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message", "User updated successfully. 0 devices added. 1 device ID was not found: invalidDeviceID123.");
    });

    it("Should not add devices if device ID is already owned", async () => {
      const existingDeviceID = devicesIDs[0];
      const oldDeviceCount = userAccount?.devices?.length || 0;
      const response = await supertest(app)
        .put(`${BASE_ROOT_API}/user/${userAccount?.username}`)
        .set("Authorization", `Bearer ${rootToken}`)
        .send({
          devices: [existingDeviceID],
        });
      expect(response.status).toBe(200);
      const updatedUser = await User.findOne({ username: userAccount?.username });
      expect(updatedUser).toBeDefined();
      expect(updatedUser?.devices.length).toBe(oldDeviceCount);
    });

    it("Should delete user account", async () => {
      const deleteResponse = await supertest(app).delete(`${BASE_ROOT_API}/user/${userAccount?.username}`).set("Authorization", `Bearer ${rootToken}`);
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body).toHaveProperty("message", "User account deleted successfully");

      const deletedUser = await User.findOne({ username: userAccount?.username });
      expect(deletedUser).toBeDefined();
      expect(deletedUser?.isDeleted).toBe(true);
      expect(deletedUser?.deletedBy?.toString()).toBe((rootAccount as any)._id.toString());
      expect(deletedUser?.deletedAt).toBeDefined();

      const root = await Root.findOne({ username: rootAccount?.username });
      expect(root).toBeDefined();
    });

    it("Should return User Devices", async () => {
      const response = await supertest(app).get(`${BASE_ROOT_API}/user/${userAccount?.username}/device`).set("Authorization", `Bearer ${rootToken}`);
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(userAccount?.devices?.length || 0);
      response.body.forEach((device: any) => {
        expect(device).toHaveProperty("deviceID");
        expect(device).toHaveProperty("owner");
        expect(device.owner.toString()).toBe(userAccount?._id?.toString());
      });
    });

    it("Should update Device Details", async () => {
      const deviceToUpdate = devicesData[0];
      const updatedDeviceData = {
        name: "Updated Device Name",
      };

      const response = await supertest(app).put(`${BASE_ROOT_API}/user/${userAccount?.username}/device/${deviceToUpdate?.deviceID}`).set("Authorization", `Bearer ${rootToken}`).send(updatedDeviceData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message", "Device updated successfully");

      const updatedDevice = await Device.findOne({ deviceID: deviceToUpdate?.deviceID });
      expect(updatedDevice).toBeDefined();
      expect(updatedDevice?.name).toBe(updatedDeviceData.name);
    });

    it("Should Delete User Device", async () => {
      const deviceToDeleteId = devicesData[0]?.deviceID;
      const oldDevicesCount = userAccount?.devices?.length || 0;
      const response = await supertest(app).delete(`${BASE_ROOT_API}/user/${userAccount?.username}/device/${deviceToDeleteId}`).set("Authorization", `Bearer ${rootToken}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message", "Device deleted successfully");

      const deletedDevice = await Device.findOne({ deviceID: deviceToDeleteId });
      expect(deletedDevice).toBeDefined();
      expect(deletedDevice?.isDeleted).toBe(true);
      expect(deletedDevice?.deletedBy?.toString()).toBe((rootAccount as any)._id.toString());
      expect(deletedDevice?.deletedAt).toBeDefined();
      expect(deletedDevice?.updatedBy?.toString()).toBe((rootAccount as any)._id.toString());
      expect(deletedDevice?.updatedAt).toBeDefined();
      expect(deletedDevice?.owner).toBeNull();

      const updatedUser = await User.findOne({ username: userAccount?.username });
      expect(updatedUser).toBeDefined();
      expect(updatedUser?.devices.length).toBe(oldDevicesCount - 1);
      expect(updatedUser?.devices).not.toContainEqual(deletedDevice?._id);
    });
  });
});
