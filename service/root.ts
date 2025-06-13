import Root from "@/model/root";

export const isMasterKeyExists = async (masterKey: string): Promise<boolean> => {
  const root = await Root.findOne({ masterkey: masterKey });
  return !!root;
};
