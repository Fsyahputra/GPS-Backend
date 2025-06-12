import Account from "@/model/account";
import UserSchema from "@/schema/user";
import type { UserDoc } from "@/types/types";

const User = Account.discriminator<UserDoc>("User", UserSchema);

export default User;
