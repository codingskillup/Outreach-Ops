export type CheckStatus =
  | "Pass"
  | "Fail"
  | "Warning";

export type DomainRecord = {
  id: string;
  domain: string;
  client: string;
  emailguard: string;
  spf: CheckStatus;
  dkim: CheckStatus;
  dmarc: CheckStatus;
  blacklist: CheckStatus;
  lastChecked: string;
};

export const domainDemoData: DomainRecord[] = [
  {
    id: "domain1",
    domain: "reverba.com",
    client: "Reverba",
    emailguard: "EmailGuard Main",
    spf: "Pass",
    dkim: "Pass",
    dmarc: "Pass",
    blacklist: "Pass",
    lastChecked: "Today 8:06 AM",
  },
  {
    id: "domain2",
    domain: "reverbaoutreach.com",
    client: "Reverba",
    emailguard: "EmailGuard Main",
    spf: "Pass",
    dkim: "Pass",
    dmarc: "Warning",
    blacklist: "Pass",
    lastChecked: "Today 8:06 AM",
  },
  {
    id: "domain3",
    domain: "trialxexample.com",
    client: "TrialX",
    emailguard: "EmailGuard 2",
    spf: "Pass",
    dkim: "Pass",
    dmarc: "Fail",
    blacklist: "Pass",
    lastChecked: "Today 8:07 AM",
  },
  {
    id: "domain4",
    domain: "clientthreeexample.com",
    client: "Client Three",
    emailguard: "EmailGuard 2",
    spf: "Pass",
    dkim: "Pass",
    dmarc: "Pass",
    blacklist: "Fail",
    lastChecked: "Today 8:07 AM",
  },
  {
    id: "domain5",
    domain: "clientfourmail.com",
    client: "Client Four",
    emailguard: "EmailGuard 3",
    spf: "Warning",
    dkim: "Pass",
    dmarc: "Pass",
    blacklist: "Pass",
    lastChecked: "Today 8:08 AM",
  },
];