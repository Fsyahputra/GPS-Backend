import { Schema } from "mongoose";
import { z } from "zod";

const CommandSchema = new Schema(
  {
    command: { type: String, required: true },
    response: { type: String, required: true },
  },
  { _id: false }
);
const InitCommandSchema = new Schema(
  {
    deviceCheck: { type: CommandSchema, required: true },
    simCheck: { type: CommandSchema, required: true },
    signalCheck: { type: CommandSchema, required: true },
    regCheck: { type: CommandSchema, required: true },
    gprsRegCheck: { type: CommandSchema, required: true },
    gprsCheck: { type: CommandSchema, required: true },
    operatorCheck: { type: CommandSchema, required: true },
  },
  { _id: false }
);
const GPSThresholdSchema = new Schema(
  {
    satellite: { type: Number, required: true },
    hdop: { type: Number, required: true },
    distance: { type: Number, required: true },
  },
  { _id: false }
);
const ModuleBaudSchema = new Schema(
  {
    moduleName: { type: String, required: true },
    baudRate: { type: Number, required: true },
  },
  { _id: false }
);
const ESPConfigSchema = new Schema(
  {
    timeInterval: { type: Number, required: true },
    GPS: { type: ModuleBaudSchema, required: true },
    SIM: { type: ModuleBaudSchema, required: true },
  },
  { _id: false }
);
const NetworkConfigSchema = new Schema(
  {
    apn: { type: String, required: true },
    username: { type: String, required: false, default: "" },
    password: { type: String, required: false, default: "" },
    operator: { type: String, required: false, default: "" },
    rssiThreshold: { type: Number, required: true },
    URL: { type: String, required: true },
    key: { type: String, required: true },
    phoneNumber: { type: String, required: true },
  },
  { _id: false }
);

export const ConfigSchema = new Schema(
  {
    initCommand: { type: InitCommandSchema, required: true },
    gpsThreshold: { type: GPSThresholdSchema, required: true },
    espConfig: { type: ESPConfigSchema, required: true },
    networkConfig: { type: NetworkConfigSchema, required: true },
  },
  { timestamps: true }
);

export default ConfigSchema;

const CommandZodSchema = z.object({
  command: z.string(),
  response: z.string(),
});
const InitCommandZodSchema = z.object({
  deviceCheck: CommandZodSchema,
  simCheck: CommandZodSchema,
  signalCheck: CommandZodSchema,
  regCheck: CommandZodSchema,
  gprsRegCheck: CommandZodSchema,
  gprsCheck: CommandZodSchema,
  operatorCheck: CommandZodSchema,
});
const GPSThresholdZodSchema = z.object({
  satellite: z.number(),
  hdop: z.number(),
  distance: z.number(),
});
const ModuleBaudZodSchema = z.object({
  moduleName: z.string(),
  baudRate: z.number(),
});
const ESPConfigZodSchema = z.object({
  timeInterval: z.number(),
  GPS: ModuleBaudZodSchema,
  SIM: ModuleBaudZodSchema,
});
const NetworkConfigZodSchema = z.object({
  apn: z.string(),
  username: z.string().optional().default(""),
  password: z.string().optional().default(""),
  operator: z.string().optional().default(""),
  rssiThreshold: z.number(),
  URL: z.string(),
  key: z.string(),
  phoneNumber: z.string(),
});

export const ConfigZodSchema = z.object({
  initCommand: InitCommandZodSchema,
  gpsThreshold: GPSThresholdZodSchema,
  espConfig: ESPConfigZodSchema,
  networkConfig: NetworkConfigZodSchema,
});
