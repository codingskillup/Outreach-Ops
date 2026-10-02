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
        <div
          style="
            max-width: 600px;
            margin: 0 auto;
            padding: 28px;
            font-family: Arial, sans-serif;
            color: #111827;
          "
        >
          <h2>
            Outreach Ops
          </h2>

          <p>
            Your email notification settings are working.
          </p>

          <div
            style="
              margin-top: 20px;
              padding: 14px;
              background: #f0fdf4;
              border: 1px solid #bbf7d0;
              border-radius: 8px;
            "
          >
            Test notification delivered successfully.
          </div>

          <p
            style="
              margin-top: 24px;
              color: #6b7280;
              font-size: 13px;
            "
          >
            Recipient:
            ${recipient.email}
          </p>
        </div>
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