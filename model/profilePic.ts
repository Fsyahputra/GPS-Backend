import ProfilePicSchema from "@/schema/profilePic";
import type { ProfilePicDoc } from "@/types/types";
import { model } from "mongoose";

const ProfilePic = model<ProfilePicDoc>("ProfilePic", ProfilePicSchema);

export default ProfilePic;
