import { Schema } from "mongoose";
import Account from "../models";
import type { AccountDoc, AccountType } from "../models";
import type { InferSchemaType, HydratedDocument } from "mongoose";

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

export type RootType = InferSchemaType<typeof RootSchema> & AccountType;
export type RootDoc = HydratedDocument<RootType>;

const Root = Account.discriminator<RootDoc>("Root", RootSchema);
export default Root;
