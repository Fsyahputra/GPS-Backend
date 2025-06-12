import { ConfigSchema } from "@/schema/config";
import { model } from "mongoose";

const Config = model("Config", ConfigSchema);

export default Config;
