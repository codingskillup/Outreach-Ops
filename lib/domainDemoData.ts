export type DomainDemoRecord = {
  id: string;
  domain: string;
  client: string;

  spfStatus:
    | "Valid"
    | "Invalid";

  dkimStatus:
    | "Valid"
    | "Invalid";

  dmarcStatus:
    | "Valid"
    | "Invalid";

  dmarcPolicy: string;

  reportingStatus:
    | "Monitored"
    | "Not Monitored";

  overallStatus:
    | "Healthy"
    | "Attention";
};

export const domainDemoData: DomainDemoRecord[] = [
  {
    id: "domain-1",

    domain:
      "trialxmail.com",

    client:
      "TrialX",

    spfStatus:
      "Valid",

    dkimStatus:
      "Valid",

    dmarcStatus:
      "Valid",

    dmarcPolicy:
      "quarantine",

    reportingStatus:
      "Monitored",

    overallStatus:
      "Healthy",
  },

  {
    id: "domain-2",

    domain:
      "trialxreach.com",

    client:
      "TrialX",

    spfStatus:
      "Valid",

    dkimStatus:
      "Valid",

    dmarcStatus:
      "Invalid",

    dmarcPolicy:
      "none",

    reportingStatus:
      "Not Monitored",

    overallStatus:
      "Attention",
  },

  {
    id: "domain-3",

    domain:
      "reverbaoutreach.com",

    client:
      "Reverba",

    spfStatus:
      "Valid",

    dkimStatus:
      "Valid",

    dmarcStatus:
      "Valid",

    dmarcPolicy:
      "quarantine",

    reportingStatus:
      "Monitored",

    overallStatus:
      "Healthy",
  },

  {
    id: "domain-4",

    domain:
      "reverbamail.com",

    client:
      "Reverba",

    spfStatus:
      "Valid",

    dkimStatus:
      "Invalid",

    dmarcStatus:
      "Valid",

    dmarcPolicy:
      "quarantine",

    reportingStatus:
      "Monitored",

    overallStatus:
      "Attention",
  },

  {
    id: "domain-5",

    domain:
      "clientthree.io",

    client:
      "Client Three",

    spfStatus:
      "Valid",

    dkimStatus:
      "Valid",

    dmarcStatus:
      "Valid",

    dmarcPolicy:
      "quarantine",

    reportingStatus:
      "Monitored",

    overallStatus:
      "Healthy",
  },
];