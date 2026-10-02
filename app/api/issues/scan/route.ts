import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  scanIssues,
} from "@/lib/issues/scanIssues";

export const runtime =
  "nodejs";

export async function POST() {
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

    const summary =
      await scanIssues({
        supabase,
        userId:
          user.id,
        sendAlerts:
          true,
      });

    if (
      summary.accountsChecked ===
        0 &&
      summary.domainsChecked ===
        0
    ) {
      return NextResponse.json(
        {
          error:
            "No synced Smartlead accounts or EmailGuard domains found.",
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Issue scan failed.",
      },
      {
        status: 500,
      }
    );
  }
}