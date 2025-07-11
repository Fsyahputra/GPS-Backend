import type AccountSchema from "@/schema/account";
import type AdminSchema from "@/schema/admin";
import type blacklistTokenSchema from "@/schema/blackListToken";
import type ConfigSchema from "@/schema/config";
import type DeviceSchema from "@/schema/device";
import type LocationSchema from "@/schema/location";
import type ProfilePicSchema from "@/schema/profilePic";
import type RootSchema from "@/schema/root";
import type UserSchema from "@/schema/user";
import type { Request } from "express";
import type { InferSchemaType, HydratedDocument } from "mongoose";

export interface AccountRequest extends Request {
  account?: AccountDoc;
  file?: Express.Multer.File;
  filepath?: string;
  decodedToken?: AccountTokenPayload;
  devices?: DeviceDoc[];
  existingAccount?: AccountDoc;
  accountType?: "Root" | "Admin" | "User" | any;
}

export interface EncryptedDeviceRequest extends Request {
  encryptedData?: string;
  response?: string;
  decryptedData?: object;
  device?: DeviceDoc;
}

export interface DecryptedDeviceRequest extends Request {
  decryptedData?: object;
  response?: object;
  device?: DeviceDoc;
}

export interface AdminRequest extends Omit<AccountRequest, "account"> {
  account?: AdminDoc;
  user?: UserDoc;
  devices?: DeviceDoc[];
  config?: ConfigDoc;
  command?: DeviceCommand;
}

export interface RootRequest extends Omit<AdminRequest, "account"> {
  account?: RootDoc;
  admin?: AdminDoc;
  user?: UserDoc;
  devices?: DeviceDoc[];
  config?: ConfigDoc;
  command?: DeviceCommand;
}

export interface UserRequest extends Omit<AccountRequest, "account"> {
  account?: UserDoc;
}

export interface AccountTokenPayload {
  id: string;
  email: string;
  username: string;
  role: string;
  isAccepted?: boolean;
  exp?: number;
  iat?: number;
}

export interface EncryptedData {
  iv: string;
  cipherText: string;
}

export interface EncryptedBufferData {
  ivBuffer: Buffer;
  cipherTextBuffer: Buffer;
}

export enum Command {
  // TODO: Gonna Implement these commands in the future
  START = "start",
  STOP = "stop",
  RESTART = "restart",
  UPDATE = "update",
  DELETE = "delete",
  SEND_COMMAND = "send_command",
}

export type DeviceCommand = `${Command}`;

export type AdmRootRequest = RootRequest & AdminRequest & { command?: DeviceCommand };

export type DeviceType = InferSchemaType<typeof DeviceSchema>;
export type DeviceDoc = HydratedDocument<DeviceType>;

export type AccountType = InferSchemaType<typeof AccountSchema> & {
  comparePassword(candidate: string): Promise<boolean>;
  __t?: string;
};

export type AccountDoc = HydratedDocument<AccountType>;

export type ProfilePicType = InferSchemaType<typeof ProfilePicSchema>;
export type ProfilePicDoc = HydratedDocument<ProfilePicType>;

export type BlacklistTokenType = InferSchemaType<typeof blacklistTokenSchema>;
export type BlacklistTokenDoc = HydratedDocument<BlacklistTokenType>;

export type UserType = InferSchemaType<typeof UserSchema> & AccountDoc;
export type UserDoc = HydratedDocument<UserType>;

export type RootType = InferSchemaType<typeof RootSchema> & AccountType;
export type RootDoc = HydratedDocument<RootType>;

export type AdminType = InferSchemaType<typeof AdminSchema> & AccountType;
export type AdminDoc = HydratedDocument<AdminType>;

export type LocationType = InferSchemaType<typeof LocationSchema>;
export type LocationDoc = HydratedDocument<LocationType>;

export type ConfigType = InferSchemaType<typeof ConfigSchema>;
export type ConfigDoc = HydratedDocument<ConfigType>;
