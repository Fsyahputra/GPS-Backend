import { Schema } from "mongoose";
import bycrpt from "bcrypt";
import type { AccountDoc, AccountType } from "@/types/types";

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
    deletedAt: { type: Date, required: false, default: null },
    deletedBy: { type: Schema.Types.ObjectId, required: false, ref: "Account", default: null },
    isDeleted: { type: Boolean, required: false, default: false },
    updatedAt: { type: Date, required: false, default: null },
    updatedBy: { type: Schema.Types.ObjectId, required: false, ref: "Account", default: null },
  },
  { timestamps: true }
);

AccountSchema.pre<AccountDoc>("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bycrpt.genSalt(10);
  this.password = await bycrpt.hash(this.password, salt);
  next();
});

AccountSchema.methods.comparePassword = async function (this: AccountType, candidate: string): Promise<Boolean> {
  return bycrpt.compare(candidate, this.password);
};

export default AccountSchema;
