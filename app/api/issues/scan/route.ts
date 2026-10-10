import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scanIssues } from "@/lib/issues/scanIssues";
import { syncAllUserIntegrations } from "@/lib/sync/syncService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const skipSync = searchParams.get("skipSync") === "true";

    // 1. Sync live integrations first so the audit always inspects fresh Smartlead/EmailGuard data
    let syncResults: unknown[] = [];
    if (!skipSync) {
      try {
        syncResults = await syncAllUserIntegrations(user.id);
      } catch (syncErr) {
        console.warn("Integration sync warning prior to issue audit:", syncErr);
      }
    }

    // 2. Run drift detection & issue audit
    const summary = await scanIssues({
      supabase,
      userId: user.id,
      sendAlerts: true,
    });

    if (
      summary.accountsChecked === 0 &&
      summary.domainsChecked === 0
    ) {
      return NextResponse.json(
        {
          error: "No synced Smartlead accounts or EmailGuard domains found.",
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json({
      success: true,
      syncResults,
      summary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Issue scan failed.",
      },
      {
        status: 500,
      }
    );
  }
}