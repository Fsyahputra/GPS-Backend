import { Schema } from "mongoose";

const blacklistTokenSchema = new Schema({
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export default blacklistTokenSchema;
