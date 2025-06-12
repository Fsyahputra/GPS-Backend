import { Schema } from "mongoose";

const RootSchema = new Schema(
  {
    masterkey: {
      type: String,
      required: true,
      unique: true,
    },
    AccReq: [{ type: Schema.Types.ObjectId, ref: "Account", default: [], required: false }],
  },
  {
    timestamps: true,
  }
);

export default RootSchema;
