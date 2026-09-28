export type IssueSeverity =
  | "Critical"
  | "Warning"
  | "Info";

export type IssueStatus =
  | "Open"
  | "Resolved";

export type IssueSource =
  | "Smartlead"
  | "EmailGuard";

export type IssueRecord = {
  id: string;
  source: IssueSource;
  client: string;
  issueType: string;
  item: string;
  accountType?: string;
  smartlead?: string;
  currentValue?: string;
  expectedValue?: string;
  severity: IssueSeverity;
  status: IssueStatus;
  detectedAt: string;
};

export const issueDemoData: IssueRecord[] = [
  {
    id: "issue1",
    source: "Smartlead",
    client: "Reverba",
    issueType: "Daily Limit",
    item: "sales@reverba.com",
    accountType: "Hypertide Azure/Entra",
    smartlead: "Smartlead 2",
    currentValue: "40",
    expectedValue: "2",
    severity: "Warning",
    status: "Open",
    detectedAt: "Today 8:04 AM",
  },
  {
    id: "issue2",
    source: "Smartlead",
    client: "Reverba",
    issueType: "Warmup Disabled",
    item: "hello@reverba.com",
    accountType: "Hypertide Google",
    smartlead: "Smartlead 2",
    currentValue: "OFF",
    expectedValue: "ON",
    severity: "Warning",
    status: "Open",
    detectedAt: "Today 8:04 AM",
  },
  {
    id: "issue3",
    source: "Smartlead",
    client: "TrialX",
    issueType: "Minimum Gap",
    item: "team@trialx.com",
    accountType: "Hypertide Azure/Entra",
    smartlead: "Smartlead Main",
    currentValue: "35",
    expectedValue: "60",
    severity: "Warning",
    status: "Open",
    detectedAt: "Today 8:05 AM",
  },
  {
    id: "issue4",
    source: "EmailGuard",
    client: "TrialX",
    issueType: "DMARC",
    item: "trialxexample.com",
    currentValue: "Failed",
    expectedValue: "Valid",
    severity: "Critical",
    status: "Open",
    detectedAt: "Today 8:06 AM",
  },
  {
    id: "issue5",
    source: "EmailGuard",
    client: "Client Three",
    issueType: "Blacklist",
    item: "clientthreeexample.com",
    currentValue: "Listed",
    expectedValue: "Clear",
    severity: "Critical",
    status: "Open",
    detectedAt: "Today 8:06 AM",
  },
  {
    id: "issue6",
    source: "Smartlead",
    client: "Client Four",
    issueType: "Warmup Daily",
    item: "outreach@clientfour.com",
    accountType: "Google Workspace",
    smartlead: "Smartlead Main",
    currentValue: "10",
    expectedValue: "25",
    severity: "Warning",
    status: "Open",
    detectedAt: "Today 8:07 AM",
  },
  {
    id: "issue7",
    source: "Smartlead",
    client: "TrialX",
    issueType: "Daily Limit",
    item: "old@trialx.com",
    accountType: "Hypertide Google",
    smartlead: "Smartlead Main",
    currentValue: "20",
    expectedValue: "20",
    severity: "Info",
    status: "Resolved",
    detectedAt: "Yesterday 8:04 AM",
  },
];