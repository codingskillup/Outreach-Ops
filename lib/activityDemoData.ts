export type ActivityType =
  | "Daily Sync"
  | "Smartlead Sync"
  | "EmailGuard Sync"
  | "Issue Found"
  | "Issue Resolved"
  | "Manual Refresh";

export type ActivityStatus =
  | "Success"
  | "Warning"
  | "Failed";

export type ActivityRecord = {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  source: string;
  status: ActivityStatus;
  date: string;
  time: string;
};

export const activityDemoData: ActivityRecord[] = [
  {
    id: "activity1",
    type: "Daily Sync",
    title: "Daily infrastructure check completed",
    description:
      "3,648 email accounts, 24 active campaigns and 158 domains checked.",
    source: "System",
    status: "Success",
    date: "Today",
    time: "8:04 AM",
  },
  {
    id: "activity2",
    type: "Smartlead Sync",
    title: "Smartlead Main synced",
    description:
      "3,098 email accounts and 10 active campaigns checked.",
    source: "Smartlead Main",
    status: "Success",
    date: "Today",
    time: "8:01 AM",
  },
  {
    id: "activity3",
    type: "Smartlead Sync",
    title: "Smartlead 2 synced",
    description:
      "550 email accounts and 14 active campaigns checked.",
    source: "Smartlead 2",
    status: "Success",
    date: "Today",
    time: "8:02 AM",
  },
  {
    id: "activity4",
    type: "EmailGuard Sync",
    title: "EmailGuard connections synced",
    description:
      "158 domains checked for SPF, DKIM, DMARC and blacklist status.",
    source: "EmailGuard",
    status: "Success",
    date: "Today",
    time: "8:03 AM",
  },
  {
    id: "activity5",
    type: "Issue Found",
    title: "Daily limit issue found",
    description:
      "sales@reverba.com is using 40. Expected value is 2.",
    source: "Smartlead",
    status: "Warning",
    date: "Today",
    time: "8:04 AM",
  },
  {
    id: "activity6",
    type: "Issue Found",
    title: "DMARC issue detected",
    description:
      "trialxexample.com failed the latest DMARC check.",
    source: "EmailGuard",
    status: "Warning",
    date: "Today",
    time: "8:06 AM",
  },
  {
    id: "activity7",
    type: "Issue Resolved",
    title: "Warmup issue resolved",
    description:
      "Warmup is now enabled for hello@reverba.com.",
    source: "Smartlead",
    status: "Success",
    date: "Today",
    time: "9:20 AM",
  },
  {
    id: "activity8",
    type: "Manual Refresh",
    title: "Manual dashboard refresh completed",
    description:
      "All connected services were checked again.",
    source: "System",
    status: "Success",
    date: "Today",
    time: "11:42 AM",
  },
  {
    id: "activity9",
    type: "Smartlead Sync",
    title: "Smartlead sync failed",
    description:
      "The connection could not be reached during the scheduled check.",
    source: "Smartlead Main",
    status: "Failed",
    date: "Yesterday",
    time: "8:01 AM",
  },
];