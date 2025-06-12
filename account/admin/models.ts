import { Schema } from "mongoose";
import type { AccountDoc, AccountType } from "../models";
import type { InferSchemaType, HydratedDocument } from "mongoose";
import Account from "../models";

const AdminSchema = new Schema(
  {
    issuedAt: { type: Date, required: false, default: null },
    issuedBy: { type: Schema.Types.ObjectId, ref: "Account", default: null },
    isAccepted: { type: Boolean, required: true, default: false },
  },
  {
    timestamps: true,
  }
);

export type AdminType = InferSchemaType<typeof AdminSchema> & AccountType;
export type AdminDoc = HydratedDocument<AdminType>;

AdminSchema.pre<AdminDoc>("save", async function (next) {
  if (this.isAccepted && this.isModified("isAccepted")) {
    const issuer = (await Account.findById(this.issuedBy)) as AccountDoc | null;
    if (!issuer) return next(new Error("Issued by required"));
    if (issuer.__t !== "Root") return next(new Error("Issuer must Root Account"));
    next();
  }
});

const Admin = Account.discriminator<AdminDoc>("Admin", AdminSchema);

export default Admin;
