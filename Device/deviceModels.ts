import { Schema, model } from "mongoose";
import type { InferSchemaType, HydratedDocument } from "mongoose";

const DeviceSchema = new Schema(
  {
    name: { type: String, required: true },
    lastOnline: { type: Date, default: Date.now, required: false },
    lastCommand: { type: String, default: null, required: false },
    lastLocation: { type: Schema.Types.ObjectId, ref: "Location", default: null, required: false },
    owner: { type: Schema.Types.ObjectId, default: null, ref: "Account", required: false },
    currentConfigId: { type: Schema.Types.ObjectId, ref: "Config", required: false },
    configHistoryIds: [{ type: Schema.Types.ObjectId, ref: "Config", default: [] }],
    softwareVersion: { type: String, required: false },
    deviceID: { type: String, required: true, unique: true },
    commandHistory: [
      {
        command: { type: String, required: true },
        timestamp: { type: Date, default: Date.now, required: true },
      },
    ],
  },
  { timestamps: true }
);

export type DeviceType = InferSchemaType<typeof DeviceSchema>;
export type DeviceDoc = HydratedDocument<DeviceType>;
const Device = model<DeviceDoc>("Device", DeviceSchema);
export default Device;
