import DeviceSchema from "@/schema/device";
import type { DeviceDoc } from "@/types/types";
import { model } from "mongoose";

const Device = model<DeviceDoc>("Device", DeviceSchema);

export default Device;
