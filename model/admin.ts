import Account from "@/model/account";
import AdminSchema from "@/schema/admin";
import type { AdminDoc } from "@/types/types";

const Admin = Account.discriminator<AdminDoc>("Admin", AdminSchema);

export default Admin;
