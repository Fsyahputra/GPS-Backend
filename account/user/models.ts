import { Schema } from "mongoose";
import Account, { type AccountDoc } from "../models";
import type { InferSchemaType, HydratedDocument } from "mongoose";

const UserSchema = new Schema({
  devices: [{ type: Schema.Types.ObjectId, ref: "Device", default: [], required: false }],
});

type UserType = InferSchemaType<typeof UserSchema> & AccountDoc;
export type UserDoc = HydratedDocument<UserType>;

const User = Account.discriminator<UserDoc>("User", UserSchema);

export default User;
