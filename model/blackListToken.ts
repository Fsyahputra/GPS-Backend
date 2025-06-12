import blacklistTokenSchema from "@/schema/blackListToken";
import type { BlacklistTokenDoc } from "@/types/types";
import { model } from "mongoose";

const BlacklistToken = model<BlacklistTokenDoc>("BlacklistToken", blacklistTokenSchema);

export default BlacklistToken;
