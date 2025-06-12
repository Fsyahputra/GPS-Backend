import LocationSchema from "@/schema/location";
import { model } from "mongoose";

const Location = model("Location", LocationSchema);

export default Location;
