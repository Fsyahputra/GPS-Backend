import { DEFAULT_PROFILE_PIC } from "@/constants";
import { Schema } from "mongoose";

const ProfilePicSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, required: true, ref: "Account" },
    pathFile: { type: String, required: false, default: DEFAULT_PROFILE_PIC },
  },
  { timestamps: true }
);

export default ProfilePicSchema;
