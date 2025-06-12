import { Schema } from "mongoose";

const UserSchema = new Schema({
  devices: [{ type: Schema.Types.ObjectId, ref: "Device", default: [], required: false }],
});

export default UserSchema;
