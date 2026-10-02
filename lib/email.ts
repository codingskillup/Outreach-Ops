import {
  Resend,
} from "resend";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

let resendClient:
  | Resend
  | null = null;

export type NotificationType =
  | "instant_issue_alert"
  | "daily_report";

function getResend() {
  if (resendClient) {
    return resendClient;
  }

  const apiKey =
    process.env
      .RESEND_API_KEY;

  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is missing."
    );
  }

  resendClient =
    new Resend(
      apiKey
    );

  return resendClient;
}

function getFromEmail() {
  return (
    process.env
      .EMAIL_FROM ||
    "Outreach Ops <onboarding@resend.dev>"
  );
}

export async function getNotificationRecipients({
  supabase,
  userId,
  type,
}: {
  supabase: SupabaseClient;
  userId: string;
  type: NotificationType;
}) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "notification_recipients"
      )
      .select(`
        email
      `)
      .eq(
        "user_id",
        userId
      )
      .eq(
        "is_active",
        true
      )
      .eq(
        type,
        true
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return (
    data || []
  )
    .map(
      (recipient) =>
        recipient.email
          ?.trim()
          .toLowerCase()
    )
    .filter(
      (
        email
      ): email is string =>
        Boolean(
          email
        )
    );
}

export async function sendNotificationEmail({
  supabase,
  userId,
  type,
  subject,
  html,
}: {
  supabase: SupabaseClient;
  userId: string;
  type: NotificationType;
  subject: string;
  html: string;
}) {
  const recipients =
    await getNotificationRecipients({
      supabase,
      userId,
      type,
    });

  if (
    recipients.length ===
    0
  ) {
    return {
      sent: false,
      skipped: true,
      recipients: [],
      reason:
        "No active recipients configured for this notification type.",
    };
  }

  const resend =
    getResend();

  const {
    data,
    error,
  } =
    await resend.emails.send({
      from:
        getFromEmail(),

      to:
        recipients,

      subject,

      html,
    });

  if (error) {
    throw new Error(
      error.message ||
        "Email sending failed."
    );
  }

  return {
    sent: true,
    skipped: false,
    recipients,
    data,
  };
}

export async function sendDirectEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const resend =
    getResend();

  const {
    data,
    error,
  } =
    await resend.emails.send({
      from:
        getFromEmail(),

      to: [to],

      subject,

      html,
    });

  if (error) {
    throw new Error(
      error.message ||
        "Email sending failed."
    );
  }

  return data;
}