export type AccountType =
  | "Hypertide Azure/Entra"
  | "Hypertide Google"
  | "Google Workspace";

export type AccountRule = {
  accountType: AccountType;
  dailyLimit: number;
  minimumGap: number;
  warmupEnabled: boolean;
  warmupDaily: number;
  rampUp: number;
  randomize: number;
  replyRate: number;
  targetReplies: number;
};

export const accountRules: Record<AccountType, AccountRule> = {
  "Hypertide Azure/Entra": {
    accountType: "Hypertide Azure/Entra",
    dailyLimit: 2,
    minimumGap: 60,
    warmupEnabled: true,
    warmupDaily: 5,
    rampUp: 1,
    randomize: 5,
    replyRate: 60,
    targetReplies: 8,
  },

  "Hypertide Google": {
    accountType: "Hypertide Google",
    dailyLimit: 20,
    minimumGap: 35,
    warmupEnabled: true,
    warmupDaily: 10,
    rampUp: 1,
    randomize: 10,
    replyRate: 30,
    targetReplies: 10,
  },

  "Google Workspace": {
    accountType: "Google Workspace",
    dailyLimit: 15,
    minimumGap: 20,
    warmupEnabled: true,
    warmupDaily: 25,
    rampUp: 5,
    randomize: 25,
    replyRate: 50,
    targetReplies: 25,
  },
};