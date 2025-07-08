import { Schema } from "mongoose";

const DeviceSchema = new Schema(
  {
    name: { type: String, required: true },
    lastOnline: { type: Date, default: Date.now, required: false },
    lastCommand: { type: String, default: null, required: false },
    lastLocation: { type: Schema.Types.ObjectId, ref: "Location", default: null, required: false },
    owner: { type: Schema.Types.ObjectId, default: null, ref: "Account", required: false },
    currentConfigId: { type: Schema.Types.ObjectId, ref: "Config", required: false }, //TODO: gonna Make this required, and make the default value to be defaultConfig
    isNewConfig: { type: Boolean, default: false, required: true },
    configHistoryIds: [{ type: Schema.Types.ObjectId, ref: "Config", default: [], required: false }],
    softwareVersion: { type: String, required: false },
    isDeleted: { type: Boolean, default: false, required: true },
    deletedAt: { type: Date, default: null, required: false },
    deletedBy: { type: Schema.Types.ObjectId, ref: "Account", default: null, required: false },
    updatedBy: { type: Schema.Types.ObjectId, ref: "Account", default: null, required: false },
    updatedAt: { type: Date, default: Date.now, required: true },
    deviceID: { type: String, required: true, unique: true },
    key: { type: String, required: true, unique: false, default: null },
    commandHistory: [
      {
        command: { type: String, required: true },
        timestamp: { type: Date, default: Date.now, required: true },
      },
    ],
  },
  { timestamps: true }
);

export default DeviceSchema;
