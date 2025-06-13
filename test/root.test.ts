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
import type { AdminDoc, AdminType, DeviceType, RootType } from "@/types/types";
import BlacklistToken from "@/model/blackListToken";
import ProfilePic from "@/model/profilePic";
import Account from "@/model/account";

dotenv.config({ path: "/home/muhammad-fadhil-syahputra/GPS/backend/.test.env" });

const DB_ADDRESS = process.env.DB_ADDRESS_TEST || "mongodb://localhost:27017/test";
const DB_PORT = process.env.DB_PORT_TEST || "27017";
const REPLICA_SET = process.env.REPLICA_SET_TEST || "rs0";
const DB_URI = `mongodb://${DB_ADDRESS}:${DB_PORT}/?replicaSet=${REPLICA_SET}`;
const originalConsoleError = console.error;
const BASE_ROOT_API = "/api/account/root";
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
    username: "rootUser",
    password: "StrongRootPassword123#",
    email: "root@example.com",
    firstName: "Root",
    lastName: "User",
    masterkey: "RootMasterKey123#",
  };

  const createRootData = (overrides: Partial<RootType> = {}): Partial<RootType> => {
    return {
      ...baseRootData,
      ...overrides,
    };
  };

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
});
