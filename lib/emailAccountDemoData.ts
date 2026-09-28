import type { AccountType } from "@/lib/accountRules";

export type DemoEmailAccount = {
  id: string;
  email: string;
  client: string;
  smartlead: string;
  accountType: AccountType;
  dailyLimit: number;
  minimumGap: number;
  warmupEnabled: boolean;
  warmupDaily: number;
  warmupReputation: number;
  bounceRate: number;
  replyRate: number;
};

export const emailAccountDemoData: DemoEmailAccount[] = [
  {
    id: "1",
    email: "alex@trialx.com",
    client: "TrialX",
    smartlead: "Smartlead Main",
    accountType: "Hypertide Azure/Entra",
    dailyLimit: 2,
    minimumGap: 60,
    warmupEnabled: true,
    warmupDaily: 5,
    warmupReputation: 100,
    bounceRate: 0,
    replyRate: 2.4,
  },
  {
    id: "2",
    email: "sales@trialx.com",
    client: "TrialX",
    smartlead: "Smartlead Main",
    accountType: "Hypertide Azure/Entra",
    dailyLimit: 40,
    minimumGap: 60,
    warmupEnabled: true,
    warmupDaily: 5,
    warmupReputation: 96,
    bounceRate: 1.2,
    replyRate: 1.8,
  },
  {
    id: "3",
    email: "hello@reverba.com",
    client: "Reverba",
    smartlead: "Smartlead 2",
    accountType: "Hypertide Google",
    dailyLimit: 20,
    minimumGap: 35,
    warmupEnabled: true,
    warmupDaily: 10,
    warmupReputation: 100,
    bounceRate: 0,
    replyRate: 3.1,
  },
  {
    id: "4",
    email: "info@reverba.com",
    client: "Reverba",
    smartlead: "Smartlead 2",
    accountType: "Hypertide Google",
    dailyLimit: 20,
    minimumGap: 20,
    warmupEnabled: false,
    warmupDaily: 5,
    warmupReputation: 82,
    bounceRate: 2.4,
    replyRate: 0.8,
  },
  {
    id: "5",
    email: "team@exampleworkspace.com",
    client: "Example Workspace",
    smartlead: "Smartlead Main",
    accountType: "Google Workspace",
    dailyLimit: 15,
    minimumGap: 20,
    warmupEnabled: true,
    warmupDaily: 25,
    warmupReputation: 100,
    bounceRate: 0,
    replyRate: 4.2,
  },
];