import AccountSchema from "@/schema/account";
import type { AccountDoc } from "@/types/types";
import { model } from "mongoose";

const Account = model<AccountDoc>("Account", AccountSchema);

export default Account;
