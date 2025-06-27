import type { AccountDoc, AccountRequest, AdminDoc, AdmRootRequest, RootDoc, UserDoc } from "../types/types";

type accountType = "Root" | "Admin" | "User" | undefined;

export const checkAccountType = (account: accountType, accountType: accountType): boolean => {
  return account === accountType ? true : false;
};

export const isRoot = (account: accountType): boolean => {
  return checkAccountType(account, "Root");
};

export const isAdmin = (account: accountType): boolean => {
  return checkAccountType(account, "Admin");
};

export const isUser = (account: accountType): boolean => {
  return checkAccountType(account, "User");
};

const checker = [isRoot, isAdmin, isUser] as const;

type CheckerType = (typeof checker)[number];

type findType = (fn: CheckerType, req: AdmRootRequest) => AccountDoc | undefined;

export const findAccount: findType = (fn, req): AccountDoc | UserDoc | AdminDoc | RootDoc | undefined => {
  if (req.account && fn(req.accountType)) {
    return req.account as AccountDoc;
  }

  if (fn === isAdmin) return req.admin as AdminDoc | undefined;
  else if (fn === isUser) return req.user as UserDoc | undefined;

  return undefined;
};

export const findUser = (req: AdmRootRequest): UserDoc | undefined => {
  return findAccount(isUser, req) as UserDoc | undefined;
};

export const findAdmin = (req: AdmRootRequest): AdminDoc | undefined => {
  return findAccount(isAdmin, req) as AdminDoc | undefined;
};

export const findRoot = (req: AdmRootRequest): RootDoc | undefined => {
  return findAccount(isRoot, req) as RootDoc | undefined;
};
