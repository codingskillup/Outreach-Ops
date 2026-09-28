export type CampaignStatus =
  | "ACTIVE"
  | "PAUSED"
  | "STOPPED"
  | "DRAFT";

export type CampaignRecord = {
  id: string;
  name: string;
  client: string;
  smartlead: string;
  status: CampaignStatus;
  accounts: number;
  createdAt: string;
  activeSince: string | null;
  sentToday: number;
  replies: number;
  bounces: number;
  issues: number;
};

export const campaignDemoData: CampaignRecord[] = [
  {
    id: "campaign1",
    name: "Reverba Main Outreach",
    client: "Reverba",
    smartlead: "Smartlead 2",
    status: "ACTIVE",
    accounts: 120,
    createdAt: "Sep 14, 2026",
    activeSince: "Sep 20, 2026",
    sentToday: 1840,
    replies: 73,
    bounces: 12,
    issues: 2,
  },
  {
    id: "campaign2",
    name: "Reverba Follow Up",
    client: "Reverba",
    smartlead: "Smartlead 2",
    status: "ACTIVE",
    accounts: 90,
    createdAt: "Sep 18, 2026",
    activeSince: "Sep 22, 2026",
    sentToday: 1260,
    replies: 48,
    bounces: 5,
    issues: 0,
  },
  {
    id: "campaign3",
    name: "Reverba Test Campaign",
    client: "Reverba",
    smartlead: "Smartlead 2",
    status: "PAUSED",
    accounts: 30,
    createdAt: "Sep 17, 2026",
    activeSince: "Sep 18, 2026",
    sentToday: 0,
    replies: 9,
    bounces: 2,
    issues: 1,
  },
  {
    id: "campaign4",
    name: "TrialX Main Outreach",
    client: "TrialX",
    smartlead: "Smartlead Main",
    status: "ACTIVE",
    accounts: 150,
    createdAt: "Sep 19, 2026",
    activeSince: "Sep 24, 2026",
    sentToday: 2130,
    replies: 81,
    bounces: 8,
    issues: 3,
  },
  {
    id: "campaign5",
    name: "TrialX Leads",
    client: "TrialX",
    smartlead: "Smartlead Main",
    status: "ACTIVE",
    accounts: 80,
    createdAt: "Sep 21, 2026",
    activeSince: "Sep 25, 2026",
    sentToday: 980,
    replies: 31,
    bounces: 4,
    issues: 0,
  },
  {
    id: "campaign6",
    name: "Client Three Outreach",
    client: "Client Three",
    smartlead: "Smartlead Main",
    status: "ACTIVE",
    accounts: 75,
    createdAt: "Sep 20, 2026",
    activeSince: "Sep 23, 2026",
    sentToday: 870,
    replies: 27,
    bounces: 3,
    issues: 1,
  },
  {
    id: "campaign7",
    name: "Client Four Outreach",
    client: "Client Four",
    smartlead: "Smartlead Main",
    status: "STOPPED",
    accounts: 45,
    createdAt: "Sep 11, 2026",
    activeSince: "Sep 15, 2026",
    sentToday: 0,
    replies: 18,
    bounces: 7,
    issues: 4,
  },
  {
    id: "campaign8",
    name: "New Leads Test",
    client: "Client Three",
    smartlead: "Smartlead Main",
    status: "DRAFT",
    accounts: 0,
    createdAt: "Sep 27, 2026",
    activeSince: null,
    sentToday: 0,
    replies: 0,
    bounces: 0,
    issues: 0,
  },
];