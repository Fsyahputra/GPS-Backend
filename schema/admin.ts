import { Schema } from "mongoose";
import Account from "@/model/account";
import type { AccountDoc, AdminDoc } from "@/types/types";

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

AdminSchema.pre<AdminDoc>("save", async function (next) {
  if (this.isAccepted && this.isModified("isAccepted")) {
    const issuer = (await Account.findById(this.issuedBy)) as AccountDoc | null;
    if (!issuer) return next(new Error("Issued by required"));
    if (issuer.__t !== "Root") return next(new Error("Issuer must Root Account"));
    next();
  }
});

export default AdminSchema;
