import { Schema, model } from "mongoose";
import bycrpt from "bcrypt";
import type { HydratedDocument, InferSchemaType } from "mongoose";

export const DEFAULT_PROFILE_PIC: string = "/home/muhammad-fadhil-syahputra/GPS/backend/uploads/default-profilepic.jpg";

const ProfilePicSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, required: true, ref: "Account" },
    pathFile: { type: String, required: false, default: DEFAULT_PROFILE_PIC },
  },
  { timestamps: true }
);

const blacklistTokenSchema = new Schema({
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

const AccountSchema = new Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    profilePic: { type: Schema.Types.ObjectId, required: false, ref: "ProfilePic" },
    roles: { type: String, required: false, default: "User" },
    lastOnline: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
export type AccountType = InferSchemaType<typeof AccountSchema> & {
  comparePassword(candidate: string): Promise<boolean>;
  __t?: string;
};

export type AccountDoc = HydratedDocument<AccountType>;

export type ProfilePicType = InferSchemaType<typeof ProfilePicSchema>;
export type ProfilePicDoc = HydratedDocument<ProfilePicType>;

export type BlacklistTokenType = InferSchemaType<typeof blacklistTokenSchema>;
export type BlacklistTokenDoc = HydratedDocument<BlacklistTokenType>;

AccountSchema.pre<AccountDoc>("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bycrpt.genSalt(10);
  this.password = await bycrpt.hash(this.password, salt);
  next();
});

AccountSchema.methods.comparePassword = async function (this: AccountType, candidate: string): Promise<Boolean> {
  return bycrpt.compare(candidate, this.password);
};

export const ProfilePic = model<ProfilePicDoc>("ProfilePic", ProfilePicSchema);
const Account = model<AccountDoc>("Account", AccountSchema);
export const BlacklistToken = model<BlacklistTokenDoc>("BlacklistToken", blacklistTokenSchema);

export default Account;
