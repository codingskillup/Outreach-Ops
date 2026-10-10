import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  sendDirectEmail,
} from "@/lib/email";

export const runtime =
  "nodejs";

export async function POST(
  request: Request
) {
  const supabase =
    await createClient();

  try {
    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    const recipientId =
      String(
        body.recipientId ||
          ""
      );

    if (!recipientId) {
      return NextResponse.json(
        {
          error:
            "Recipient is required.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: recipient,
      error:
        recipientError,
    } =
      await supabase
        .from(
          "notification_recipients"
        )
        .select(`
          id,
          email,
          is_active
        `)
        .eq(
          "id",
          recipientId
        )
        .eq(
          "user_id",
          user.id
        )
        .single();

    if (
      recipientError ||
      !recipient
    ) {
      return NextResponse.json(
        {
          error:
            "Recipient not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      !recipient.is_active
    ) {
      return NextResponse.json(
        {
          error:
            "This recipient is inactive.",
        },
        {
          status: 400,
        }
      );
    }

    await sendDirectEmail({
      to:
        recipient.email,

      subject:
        "Outreach Ops Test Notification",

      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Outreach Ops Test Notification</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0f172a;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f1f5f9" style="width: 100%; min-width: 100%; margin: 0; padding: 32px 12px; background-color: #f1f5f9;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05); text-align: left;">
                  <!-- Top Accent Line -->
                  <tr>
                    <td height="4" style="height: 4px; background-color: #10b981; line-height: 4px; font-size: 1px;">&nbsp;</td>
                  </tr>

                  <!-- Content Area -->
                  <tr>
                    <td style="padding: 28px 32px 24px 32px;">
                      <!-- Top Brand Bar -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="vertical-align: middle;">
                            <table cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="background-color: #0f172a; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; padding: 4px 8px; border-radius: 6px; text-transform: uppercase;">
                                  OP
                                </td>
                                <td style="padding-left: 8px; font-size: 16px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px;">
                                  Outreach Ops
                                </td>
                              </tr>
                            </table>
                          </td>
                          <td align="right" style="vertical-align: middle;">
                            <span style="display: inline-block; background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 9999px;">
                              ● Verified Active
                            </span>
                          </td>
                        </tr>
                      </table>

                      <!-- Heading -->
                      <h1 style="margin: 20px 0 6px 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.4px; line-height: 1.3;">
                        Test Notification Delivered
                      </h1>
                      <p style="margin: 0 0 20px 0; font-size: 14px; color: #64748b; line-height: 1.5;">
                        Your email notification settings and dispatch channel are operational.
                      </p>

                      <!-- Success Callout Box -->
                      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                        <table cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td style="vertical-align: top; padding-right: 10px; font-size: 18px; line-height: 1;">
                              &#x2705;
                            </td>
                            <td style="vertical-align: middle; font-size: 13px; color: #166534; line-height: 1.5;">
                              <strong>Delivery connection confirmed.</strong> Automated alerts, scan reports, and fleet notifications will be dispatched to this inbox.
                            </td>
                          </tr>
                        </table>
                      </div>

                      <!-- Recipient Metadata Tile -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px;">
                        <tr>
                          <td style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">
                            Recipient Address
                          </td>
                        </tr>
                        <tr>
                          <td style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; font-weight: 600; color: #0284c7; padding-top: 4px;">
                            ${recipient.email}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Card Footer -->
                  <tr>
                    <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 32px; text-align: center;">
                      <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #475569;">
                        Outreach Ops &middot; Infrastructure &amp; Drift Monitoring
                      </p>
                      <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                        This is an on-demand test email triggered from your settings panel.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    return NextResponse.json({
      success: true,

      message:
        `Test email sent to ${recipient.email}.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Test email failed.",
      },
      {
        status: 500,
      }
    );
  }
}