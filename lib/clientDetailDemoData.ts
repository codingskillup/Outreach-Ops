export type ClientCampaign = {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED";
  accounts: number;
  activeSince: string;
};

export type ClientIssue = {
  id: string;
  type: string;
  item: string;
  severity: "Warning" | "Critical";
};

export type ClientDetail = {
  id: string;
  name: string;
  totalAccounts: number;
  azureEntra: number;
  hypertideGoogle: number;
  googleWorkspace: number;
  healthyAccounts: number;
  issues: number;
  activeCampaigns: number;
  campaigns: ClientCampaign[];
  recentIssues: ClientIssue[];
};

export const clientDetailDemoData: ClientDetail[] = [
  {
    id: "reverba",
    name: "Reverba",
    totalAccounts: 550,
    azureEntra: 520,
    hypertideGoogle: 30,
    googleWorkspace: 0,
    healthyAccounts: 530,
    issues: 20,
    activeCampaigns: 14,

    campaigns: [
      {
        id: "c1",
        name: "Reverba Outreach",
        status: "ACTIVE",
        accounts: 120,
        activeSince: "Sep 20, 2026",
      },
      {
        id: "c2",
        name: "Reverba Follow Up",
        status: "ACTIVE",
        accounts: 90,
        activeSince: "Sep 22, 2026",
      },
      {
        id: "c3",
        name: "Reverba Test Campaign",
        status: "PAUSED",
        accounts: 30,
        activeSince: "Sep 18, 2026",
      },
    ],

    recentIssues: [
      {
        id: "i1",
        type: "Daily Limit",
        item: "sales@reverba.com",
        severity: "Warning",
      },
      {
        id: "i2",
        type: "Warmup Disabled",
        item: "hello@reverba.com",
        severity: "Warning",
      },
    ],
  },

  {
    id: "trialx",
    name: "TrialX",
    totalAccounts: 420,
    azureEntra: 360,
    hypertideGoogle: 60,
    googleWorkspace: 0,
    healthyAccounts: 402,
    issues: 18,
    activeCampaigns: 3,

    campaigns: [
      {
        id: "c4",
        name: "TrialX Main Outreach",
        status: "ACTIVE",
        accounts: 150,
        activeSince: "Sep 24, 2026",
      },
      {
        id: "c5",
        name: "TrialX Leads",
        status: "ACTIVE",
        accounts: 80,
        activeSince: "Sep 25, 2026",
      },
    ],

    recentIssues: [
      {
        id: "i3",
        type: "Minimum Gap",
        item: "team@trialx.com",
        severity: "Warning",
      },
    ],
  },

  {
    id: "clientthree",
    name: "Client Three",
    totalAccounts: 280,
    azureEntra: 240,
    hypertideGoogle: 25,
    googleWorkspace: 15,
    healthyAccounts: 270,
    issues: 10,
    activeCampaigns: 2,
    campaigns: [],
    recentIssues: [],
  },

  {
    id: "clientfour",
    name: "Client Four",
    totalAccounts: 190,
    azureEntra: 170,
    hypertideGoogle: 20,
    googleWorkspace: 0,
    healthyAccounts: 184,
    issues: 6,
    activeCampaigns: 1,
    campaigns: [],
    recentIssues: [],
  },
];