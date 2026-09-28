export type AccountType =
  | "Hypertide Azure/Entra"
  | "Hypertide Google"
  | "Google Workspace";

export type AccountRule = {
  dailyLimit: number;
  minimumGap: number;
  warmupEnabled: boolean;
  warmupDaily: number;
  replyRate: number;
};

export const accountRules: Record<
  AccountType,
  AccountRule
> = {
  "Hypertide Azure/Entra": {
    dailyLimit: 2,
    minimumGap: 60,
    warmupEnabled: true,
    warmupDaily: 5,
    replyRate: 60,
  },

  "Hypertide Google": {
    dailyLimit: 20,
    minimumGap: 35,
    warmupEnabled: true,
    warmupDaily: 10,
    replyRate: 30,
  },

  "Google Workspace": {
    dailyLimit: 15,
    minimumGap: 20,
    warmupEnabled: true,
    warmupDaily: 25,
    replyRate: 50,
  },
};

export function isAccountType(
  value: string | null | undefined
): value is AccountType {
  return (
    value === "Hypertide Azure/Entra" ||
    value === "Hypertide Google" ||
    value === "Google Workspace"
  );
}