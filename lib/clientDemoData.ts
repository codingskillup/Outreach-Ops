export type ClientRecord = {
  id: string;
  name: string;
  totalAccounts: number;
  azureEntra: number;
  hypertideGoogle: number;
  googleWorkspace: number;
  activeCampaigns: number;
  healthyAccounts: number;
  issues: number;
};

export const clientDemoData: ClientRecord[] = [
  {
    id: "reverba",
    name: "Reverba",
    totalAccounts: 550,
    azureEntra: 520,
    hypertideGoogle: 30,
    googleWorkspace: 0,
    activeCampaigns: 14,
    healthyAccounts: 530,
    issues: 20,
  },
  {
    id: "trialx",
    name: "TrialX",
    totalAccounts: 420,
    azureEntra: 360,
    hypertideGoogle: 60,
    googleWorkspace: 0,
    activeCampaigns: 3,
    healthyAccounts: 402,
    issues: 18,
  },
  {
    id: "clientthree",
    name: "Client Three",
    totalAccounts: 280,
    azureEntra: 240,
    hypertideGoogle: 25,
    googleWorkspace: 15,
    activeCampaigns: 2,
    healthyAccounts: 270,
    issues: 10,
  },
  {
    id: "clientfour",
    name: "Client Four",
    totalAccounts: 190,
    azureEntra: 170,
    hypertideGoogle: 20,
    googleWorkspace: 0,
    activeCampaigns: 1,
    healthyAccounts: 184,
    issues: 6,
  },
];