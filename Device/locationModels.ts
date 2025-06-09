import { Schema, model } from "mongoose";

export const CoordSchema = new Schema({
  coord: { type: Number, required: true },
  dir: { type: String, required: true, enum: ["E", "S", "W", "N"] },
});

const LocationSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, default: null, ref: "Account" },
    device: { type: Schema.Types.ObjectId, required: true, ref: "Device" },
    lat: { type: CoordSchema, required: true },
    lon: { type: CoordSchema, required: true },
    hdop: { type: Number, required: true },
  },
  { timestamps: true }
);

const Location = model("Location", LocationSchema);
export default Location;
