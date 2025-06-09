import { describe, it, beforeAll, beforeEach, afterAll, expect } from "bun:test";
import dotenv from "dotenv";
import supertest from "supertest";
import app from "../../main/app";
import connectDB from "../../main/database";
import User from "./models";
import Device, { type DeviceDoc, type DeviceType } from "@/Device/deviceModels";
import mongoose from "mongoose";
import { BlacklistToken, DEFAULT_PROFILE_PIC, ProfilePic } from "../models";
import fs from "fs";

dotenv.config({ path: ".test.env" });

const DB_ADDRESS = process.env.DB_ADDRESS || "mongodb://localhost:27017/test";
const DB_PORT = process.env.DB_PORT || "27017";
const DB_URI = `mongodb://${DB_ADDRESS}:${DB_PORT}/?replicaSet=GPS-Tracker-Test`;
const originalConsoleError = console.error;
const BASE_USER_API = "/api/account/user";
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
  await User.deleteMany({});
  await Device.deleteMany({});
});

afterAll(async () => {
  // Close the database connection after all tests
  await User.deleteMany({});
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

describe("User Account Tests", () => {
  const baseUserData = {
    firstName: "Johnasdasdasd",
    lastName: "Doeasdasdasd",
    email: "john.doe@example.com",
    password: "password123A#",
    username: "johndoe",
  };

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

  const createUserData = (overrides = {}) => ({
    ...baseUserData,
    ...overrides,
  });

  describe("User Registration and Login", () => {
    beforeEach(async () => {
      await User.deleteMany({});
      await Device.deleteMany({});
    });
    describe("User Registration", () => {
      it("Should register an account", async () => {
        const response = await supertest(app).post(`${BASE_USER_API}/register`).send(createUserData());
        expect(response.status).toBe(201);
      });

      it("Should Save the user in the database", async () => {
        const userData = createUserData();
        await supertest(app).post(`${BASE_USER_API}/register`).send(userData).expect(201);

        const user = await User.findOne({ email: userData.email });
        expect(user).not.toBeNull();
        expect(user?.email).toBe(userData.email);
        expect(user?.firstName).toBe(userData.firstName);
        expect(user?.lastName).toBe(userData.lastName);
        expect(user?.username).toBe(userData.username);
        expect(user?.roles).toBe("User");
      });

      it("Should return 400 for missing fields", async () => {
        const incompleteUserData = createUserData({ email: "" });
        const response = await supertest(app).post(`${BASE_USER_API}/register`).send(incompleteUserData);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error");
      });

      it("Should return 400 for invalid username", async () => {
        const invalidUsernameData = createUserData({ username: "1" });
        const response = await supertest(app).post(`${BASE_USER_API}/register`).send(invalidUsernameData);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error");
      });

      it("Should return 400 for invalid email", async () => {
        const invalidEmailData = createUserData({ email: "invalid-email" });
        const response = await supertest(app).post(`${BASE_USER_API}/register`).send(invalidEmailData);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toContain("Invalid email format");
      });

      it("Should return 400 for weak password", async () => {
        const weakPasswordData = createUserData({ password: "weakpassword" });
        const response = await supertest(app).post(`${BASE_USER_API}/register`).send(weakPasswordData);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toContain("Password must contain uppercase, lowercase, and number");
      });

      it("Should return 400 for duplicate email", async () => {
        const userData = createUserData();
        await supertest(app).post(`${BASE_USER_API}/register`).send(userData);

        const duplicateEmailData = createUserData({
          firstName: "Jane",
          lastName: "Doe",
          username: "janedoe",
        });
        const response = await supertest(app).post(`${BASE_USER_API}/register`).send(duplicateEmailData);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toContain("Account already exists");
      });

      it("Should return 400 for duplicate username", async () => {
        const userData = createUserData();
        const res = await supertest(app).post(`${BASE_USER_API}/register`).send(userData);
        const duplicateUsernameData = createUserData({
          email: "unique.email@example.com",
        });
        const response = await supertest(app).post(`${BASE_USER_API}/register`).send(duplicateUsernameData);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toContain("Account already exists");
      });

      it("Should return 400 for invalid first name", async () => {
        const invalidFirstNameData = createUserData({ firstName: "" });
        const response = await supertest(app).post(`${BASE_USER_API}/register`).send(invalidFirstNameData);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toContain("First name is required");
      });

      it("Should return 400 for invalid last name", async () => {
        const invalidLastNameData = createUserData({ lastName: "" });
        const response = await supertest(app).post(`${BASE_USER_API}/register`).send(invalidLastNameData);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toContain("Last name is required");
      });

      it("Should return 400 for invalid password", async () => {
        const invalidPasswordData = createUserData({ password: "short" });
        const response = await supertest(app).post(`${BASE_USER_API}/register`).send(invalidPasswordData);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toContain("Password must be at least 8 characters long");
      });
    });

    describe("User Login", () => {
      it("Should login an existing user", async () => {
        const userData = createUserData();
        await supertest(app).post(`${BASE_USER_API}/register`).send(userData);

        const response = await supertest(app).post(`${BASE_USER_API}/login`).send({
          email: userData.email,
          password: userData.password,
        });
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("token");
      });

      it("Should return 401 for invalid credentials", async () => {
        const userData = createUserData();
        await supertest(app).post(`${BASE_USER_API}/register`).send(userData);

        const response = await supertest(app).post(`${BASE_USER_API}/login`).send({
          email: userData.email,
          password: "StrongWrongPassword##112",
        });
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toContain("Invalid email or password");
      });

      it("Should return 404 for non-existing user", async () => {
        const userData = createUserData();
        const response = await supertest(app).post(`${BASE_USER_API}/login`).send(userData);
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toContain("Account not found");
      });

      it("Should return 400 for missing email", async () => {
        const userData = createUserData({ email: "" });
        const response = await supertest(app).post(`${BASE_USER_API}/login`).send(userData);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toContain("Invalid email format");
      });

      it("Should return 400 for missing password", async () => {
        const userData = createUserData({ password: "" });
        const response = await supertest(app).post(`${BASE_USER_API}/login`).send(userData);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toContain("Password must be at least 8 characters long, Password must contain uppercase, lowercase, and number");
      });

      it("Should return 400 for invalid email format", async () => {
        const userData = createUserData({ email: "invalid-email" });
        const response = await supertest(app).post(`${BASE_USER_API}/login`).send(userData);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toContain("Invalid email format");
      });

      it("Should return 400 for invalid password format", async () => {
        const userData = createUserData({ password: "short" });
        const response = await supertest(app).post(`${BASE_USER_API}/login`).send(userData);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toContain("Password must be at least 8 characters long, Password must contain uppercase, lowercase, and number");
      });

      it("Should return token on successful login", async () => {
        const userData = createUserData();
        await supertest(app).post(`${BASE_USER_API}/register`).send(userData);
        const response = await supertest(app).post(`${BASE_USER_API}/login`).send({
          email: userData.email,
          password: userData.password,
        });
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("token");
        expect(typeof response.body.token).toBe("string");
      });
    });
  });

  describe("User Account Management", () => {
    let token: string;
    let user: any;

    beforeEach(async () => {
      await User.deleteMany({});
      await Device.deleteMany({});

      const userData = createUserData();
      const response = await supertest(app).post(`${BASE_USER_API}/register`).send(userData).expect(201);
      const loginResponse = await supertest(app).post(`${BASE_USER_API}/login`).send({ email: userData.email, password: userData.password }).expect(200);
      token = loginResponse.body.token;
      user = await User.findOne({ email: userData.email });
      expect(user).not.toBeNull();
    });

    it("Should get user account details", async () => {
      const response = await supertest(app).get(`${BASE_USER_API}/`).set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("username", user.username);
      expect(response.body).toHaveProperty("email", user.email);
      expect(response.body).toHaveProperty("firstName", user.firstName);
      expect(response.body).toHaveProperty("lastName", user.lastName);
      expect(response.body).toHaveProperty("roles", "User");
    });

    it("Should update user account details", async () => {
      const updatedData = {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane.smith@example.com",
        username: "obladaObladi",
        password: "newPassword123A#",
      };
      const response = await supertest(app).put(`${BASE_USER_API}/`).set("Authorization", `Bearer ${token}`).send(updatedData);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message", "User account updated successfully");
      const updatedUser = await User.findOne({ email: updatedData.email });
      expect(updatedUser).not.toBeNull();
      expect(updatedUser).toHaveProperty("firstName", updatedData.firstName);
      expect(updatedUser).toHaveProperty("lastName", updatedData.lastName);
      expect(updatedUser).toHaveProperty("email", updatedData.email);
      expect(updatedUser).toHaveProperty("username", user.username);
      const loginResponse = await supertest(app).post(`${BASE_USER_API}/login`).send({ email: updatedData.email, password: updatedData.password });
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty("token");
    });

    it("Should delete user account", async () => {
      const response = await supertest(app).delete(`${BASE_USER_API}/`).set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message", "User account deleted successfully");
      const deletedUser = await User.findOne({ email: user.email });
      expect(deletedUser).toBeNull();
    });

    it("Should return 404 for non-existing user account", async () => {
      const response = await supertest(app).get("/api/account/user/nonExistingUser").set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Not Found");
    });

    it("Should only allow access to authenticated users", async () => {
      const response = await supertest(app).get(`${BASE_USER_API}/`);
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("No token provided");
    });

    it("Should not allow access to other users' accounts", async () => {
      const anotherUserData = createUserData({ email: "fadhil@lolon.com", password: "password123A#", username: "fadhil" });
      const anotherUserResponse = await supertest(app).post(`${BASE_USER_API}/register`).send(anotherUserData).expect(201);
      const anotherUser = await User.findOne({ email: anotherUserData.email });
      expect(anotherUser).not.toBeNull();

      const response = await supertest(app).get(`${BASE_USER_API}/`).set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(200);
      if (anotherUser) {
        expect(response.body.username).not.toBe(anotherUser.username);
        expect(response.body.email).not.toBe(anotherUser.email);
      }
    });

    it("Should Blacklist Token When user Logout", async () => {
      const response = await supertest(app).get(`${BASE_USER_API}/logout`).set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message", "User logged out successfully");

      const blacklistedToken = await BlacklistToken.findOne({ token });
      expect(blacklistedToken).not.toBeNull();

      const responseAfterLogout = await supertest(app).get(`${BASE_USER_API}/`).set("Authorization", `Bearer ${token}`);
      expect(responseAfterLogout.status).toBe(401);
      expect(responseAfterLogout.body).toHaveProperty("error");
      expect(responseAfterLogout.body.error).toContain("Token has expired");
    });

    it("Should have default profile picture", async () => {
      const account = await User.findOne({ username: user.username });
      expect(account).not.toBeNull();
      expect(account?.profilePic).not.toBeNull();

      const profilePic = await ProfilePic.findById(account?.profilePic);
      expect(profilePic).not.toBeNull();
      expect(profilePic?.pathFile).toBe(DEFAULT_PROFILE_PIC);
      expect(profilePic?.owner.toString()).toBe(account!._id.toString());
    });

    it("Should update Profile Picture", async () => {
      const imagePath = TEST_IMG_PATH;
      const response = await supertest(app).put(`${BASE_USER_API}/profile-pic`).set("Authorization", `Bearer ${token}`).attach("profilePic", imagePath);
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("message", "Profile picture uploaded successfully");
      const account = await User.findOne({ username: user.username });
      expect(account).not.toBeNull();
      expect(account?.profilePic).not.toBeNull();
      const profilePic = await ProfilePic.findById(account?.profilePic);
      expect(profilePic).not.toBeNull();
      expect(profilePic?.pathFile).not.toBe(DEFAULT_PROFILE_PIC);
      expect(profilePic?.owner.toString()).toBe(account!._id.toString());
      const profilePicPath = profilePic?.pathFile;
      expect(fs.existsSync(profilePicPath!)).toBe(true);
      fs.unlinkSync(profilePicPath!);
    });

    it("Should delete Profile Picture", async () => {
      const imagePath = TEST_IMG_PATH;
      const uploadResponse = await supertest(app).put(`${BASE_USER_API}/profile-pic`).set("Authorization", `Bearer ${token}`).attach("profilePic", imagePath);
      expect(uploadResponse.status).toBe(201);
      expect(uploadResponse.body).toHaveProperty("message", "Profile picture uploaded successfully");
      const account = await User.findById(user._id);
      expect(account).not.toBeNull();
      expect(account?.profilePic).not.toBeNull();
      const profilePic = await ProfilePic.findById(account?.profilePic);
      expect(profilePic).not.toBeNull();
      expect(profilePic?.pathFile).not.toBe(DEFAULT_PROFILE_PIC);
      const profilePicPath = profilePic?.pathFile;
      expect(profilePic?.owner.toString()).toBe(account!._id.toString());
      const deleteResponse = await supertest(app).delete(`${BASE_USER_API}/profile-pic`).set("Authorization", `Bearer ${token}`);
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body).toHaveProperty("message", "Profile picture deleted successfully");
      const deletedProfilePic = await ProfilePic.findById(account?.profilePic);
      expect(deletedProfilePic).not.toBeNull();
      expect(deletedProfilePic?.pathFile).toBe(DEFAULT_PROFILE_PIC);
      expect(fs.existsSync(deletedProfilePic?.pathFile!)).toBe(true);
      expect(fs.existsSync(profilePicPath!)).toBe(false);
    });

    it("Should not allow profile picture deletion if no picture exists", async () => {
      const response = await supertest(app).delete(`${BASE_USER_API}/profile-pic`).set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Failed to delete profile picture");
    });

    describe("Account and Device Management", () => {
      let token: string;
      let user: any;
      let device: DeviceType;
      beforeEach(async () => {
        await User.deleteMany({});
        await Device.deleteMany({});

        const userData = createUserData();
        const response = await supertest(app).post(`${BASE_USER_API}/register`).send(userData).expect(201);
        const loginResponse = await supertest(app).post(`${BASE_USER_API}/login`).send({ email: userData.email, password: userData.password }).expect(200);
        token = loginResponse.body.token;
        user = await User.findOne({ email: userData.email });
        expect(user).not.toBeNull();
        const users = await User.find({});
        device = createDeviceData();
        const deviceDoc = new Device(device);
        await deviceDoc.save();
      });

      it("Should register a device", async () => {
        const response = await supertest(app).post(`${BASE_USER_API}/device/register/${device.deviceID}`).set("Authorization", `Bearer ${token}`);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("message", "Device registered successfully");
        const updatedDevice = await Device.findOne({ deviceID: device.deviceID });
        expect(updatedDevice).not.toBeNull();
        expect(updatedDevice?.owner?.toString()).toBe(user._id.toString());
      });

      it("Should return 404 for non-existing device", async () => {
        const response = await supertest(app).post(`${BASE_USER_API}/device/register/nonExistingDeviceID`).set("Authorization", `Bearer ${token}`);
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toContain("Device Not Found");
      });

      it("Should return 400 for already registered device", async () => {
        const otherUser = createUserData({ firstName: "other", lastName: "user", email: "otherUser@gmail.com", username: "otherUser" });
        await supertest(app).post(`${BASE_USER_API}/register`).send(otherUser).expect(201);
        const otherUserLoginResponse = await supertest(app).post(`${BASE_USER_API}/login`).send({ email: otherUser.email, password: otherUser.password }).expect(200);
        const otherUserToken = otherUserLoginResponse.body.token;
        const otherUserRegisterDeviceResponse = await supertest(app).post(`${BASE_USER_API}/device/register/${device.deviceID}`).set("Authorization", `Bearer ${otherUserToken}`);
        expect(otherUserRegisterDeviceResponse.status).toBe(200);
        expect(otherUserRegisterDeviceResponse.body).toHaveProperty("message", "Device registered successfully");

        const newUserDeviceRegister = await supertest(app).post(`${BASE_USER_API}/device/register/${device.deviceID}`).set("Authorization", `Bearer ${token}`);
        expect(newUserDeviceRegister.status).toBe(400);
        expect(newUserDeviceRegister.body).toHaveProperty("error");
        expect(newUserDeviceRegister.body.error).toContain("Device already registered");
      });

      it("Should return 404 for missing device ID", async () => {
        const response = await supertest(app).post(`${BASE_USER_API}/device/register/`).set("Authorization", `Bearer ${token}`);
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toContain("Not Found");
      });

      it("Should return 401 for non-existing user", async () => {
        const nonExistingUserToken = "nonExistingUserToken";
        const response = await supertest(app).post(`${BASE_USER_API}/device/register/${device.deviceID}`).set("Authorization", `Bearer ${nonExistingUserToken}`);
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toContain("Invalid token");
      });

      it("Should update device details", async () => {
        const updatedDeviceData = {
          name: "Updated Device Name",
        };
        const registerResponse = await supertest(app).post(`${BASE_USER_API}/device/register/${device.deviceID}`).set("Authorization", `Bearer ${token}`);
        expect(registerResponse.status).toBe(200);
        expect(registerResponse.body).toHaveProperty("message", "Device registered successfully");
        const response = await supertest(app).put(`${BASE_USER_API}/device/${device.deviceID}`).set("Authorization", `Bearer ${token}`).send(updatedDeviceData);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("message", "Device updated successfully");
        const updatedDevice = await Device.findOne({ deviceID: device.deviceID });
        expect(updatedDevice).not.toBeNull();
        expect(updatedDevice?.name).toBe(updatedDeviceData.name);
      });

      it("Should return 404 for non-existing device on update", async () => {
        const response = await supertest(app).put(`${BASE_USER_API}/device/nonExistingDeviceID`).set("Authorization", `Bearer ${token}`).send({ name: "New Name" });
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toContain("Device Not Found");
      });

      it("Should return 400 for invalid device name", async () => {
        const response = await supertest(app).put(`${BASE_USER_API}/device/${device.deviceID}`).set("Authorization", `Bearer ${token}`).send({ name: "" });
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toContain("Device name must be between 1 and 50 characters");
      });

      it("Should return 404 for unauthorized device update", async () => {
        const anotherUserData = createUserData({ email: "Fadhil@lolo.com", password: "password123A#", username: "Fadhil" });
        await supertest(app).post(`${BASE_USER_API}/register`).send(anotherUserData).expect(201);
        const anotherUserLoginResponse = await supertest(app).post(`${BASE_USER_API}/login`).send({ email: anotherUserData.email, password: anotherUserData.password }).expect(200);
        const anotherUserToken = anotherUserLoginResponse.body.token;

        const registerResponseRealOwner = await supertest(app).post(`${BASE_USER_API}/device/register/${device.deviceID}`).set("Authorization", `Bearer ${token}`);
        expect(registerResponseRealOwner.status).toBe(200);
        expect(registerResponseRealOwner.body).toHaveProperty("message", "Device registered successfully");

        const response = await supertest(app).put(`${BASE_USER_API}/device/${device.deviceID}`).set("Authorization", `Bearer ${anotherUserToken}`).send({ name: "Unauthorized Update" });
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toContain("Device Not Found");
      });

      it("Should get all devices for the user", async () => {
        const device1 = createDeviceData({ deviceID: "device1", name: "ESP Device 1" });
        const device2 = createDeviceData({ deviceID: "device2", name: "ESP Device 2" });
        const device3 = createDeviceData({ deviceID: "device3", name: "ESP Device 3" });
        const devices = [device1, device2, device3];
        await Device.insertMany(devices.map((d) => new Device(d)));
        for (const d of devices) {
          const registerResponse = await supertest(app).post(`${BASE_USER_API}/device/register/${d.deviceID}`).set("Authorization", `Bearer ${token}`);
          expect(registerResponse.status).toBe(200);
          expect(registerResponse.body).toHaveProperty("message", "Device registered successfully");
        }

        const response = await supertest(app).get(`${BASE_USER_API}/device`).set("Authorization", `Bearer ${token}`);
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(devices.length);
        expect(response.body).toEqual(expect.arrayContaining(devices.map((d) => expect.objectContaining({ deviceID: d.deviceID, name: d.name }))));
      });

      it("Should return 404 for non-existing device on delete", async () => {
        const response = await supertest(app).delete(`${BASE_USER_API}/device/nonExistingDeviceID`).set("Authorization", `Bearer ${token}`);
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toContain("Device Not Found");
      });

      it("Should delete a device", async () => {
        const registerResponse = await supertest(app).post(`${BASE_USER_API}/device/register/${device.deviceID}`).set("Authorization", `Bearer ${token}`);
        expect(registerResponse.status).toBe(200);
        expect(registerResponse.body).toHaveProperty("message", "Device registered successfully");

        const response = await supertest(app).delete(`${BASE_USER_API}/device/${device.deviceID}`).set("Authorization", `Bearer ${token}`);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("message", "Device deleted successfully");
        const deletedDevice = await Device.findOne({ deviceID: device.deviceID });
        expect(deletedDevice).toBeNull();
      });

      it("Should return 404 for unauthorized device deletion", async () => {
        const anotherUserData = createUserData({ email: "Fadhil@lolo.com", password: "password123A#", username: "Fadhil" });
        await supertest(app).post(`${BASE_USER_API}/register`).send(anotherUserData).expect(201);
        const anotherUserLoginResponse = await supertest(app).post(`${BASE_USER_API}/login`).send({ email: anotherUserData.email, password: anotherUserData.password }).expect(200);
        const anotherUserToken = anotherUserLoginResponse.body.token;

        const registerResponseRealOwner = await supertest(app).post(`${BASE_USER_API}/device/register/${device.deviceID}`).set("Authorization", `Bearer ${token}`);
        expect(registerResponseRealOwner.status).toBe(200);
        expect(registerResponseRealOwner.body).toHaveProperty("message", "Device registered successfully");

        const response = await supertest(app).delete(`${BASE_USER_API}/device/${device.deviceID}`).set("Authorization", `Bearer ${anotherUserToken}`);
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toContain("Device Not Found");
      });
    });
  });
});
