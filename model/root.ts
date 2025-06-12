import Account from "@/model/account";
import RootSchema from "@/schema/root";
import type { RootDoc } from "@/types/types";

const Root = Account.discriminator<RootDoc>("Root", RootSchema);

export default Root;
