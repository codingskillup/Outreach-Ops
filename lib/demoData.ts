export const demoDashboardData = {
  summary: {
    emailAccounts: 3648,
    healthyAccounts: 3520,
    needAttention: 128,
    activeCampaigns: 24,
    domains: 158,
  },

  smartleadConnections: [
    {
      id: "smartlead1",
      name: "Smartlead Main",
      accounts: 3098,
      activeCampaigns: 10,
      status: "connected",
    },
    {
      id: "smartlead2",
      name: "Smartlead 2",
      accounts: 550,
      activeCampaigns: 14,
      status: "connected",
    },
  ],

  todaysUpdate: {
    checkedAt: "8:04 AM",
    emailAccountsChecked: 3648,
    activeCampaignsChecked: 24,
    domainsChecked: 158,
    newIssues: 12,
    resolvedIssues: 7,
  },

  accountHealth: {
    correctSettings: 3520,
    wrongDailyLimit: 42,
    warmupIssues: 31,
    connectionIssues: 8,
  },

  recentIssues: [
    {
      id: "issue1",
      title: "Daily limit incorrect",
      detail: "john@example.com",
    },
    {
      id: "issue2",
      title: "Warmup disabled",
      detail: "sales@example.com",
    },
    {
      id: "issue3",
      title: "DMARC issue detected",
      detail: "example.com",
    },
  ],
};