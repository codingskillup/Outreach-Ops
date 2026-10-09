import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

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

    const [
      accountsResult,
      issuesResult,
    ] = await Promise.all([
      supabase
        .from("email_accounts")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("user_id", user.id),

      supabase
        .from("issues")
        .select(`
          id,
          severity,
          status
        `)
        .eq("user_id", user.id)
        .eq("status", "Open"),
    ]);

    if (accountsResult.error) {
      throw new Error(
        accountsResult.error.message
      );
    }

    if (issuesResult.error) {
      throw new Error(
        issuesResult.error.message
      );
    }

    const hasLiveData =
      (accountsResult.count || 0) > 0;

    const openIssues =
      issuesResult.data || [];

    const critical =
      openIssues.filter(
        (issue) =>
          issue.severity ===
          "Critical"
      ).length;

    const warnings =
      openIssues.filter(
        (issue) =>
          issue.severity ===
          "Warning"
      ).length;

    let status:
      | "operational"
      | "warning"
      | "critical" =
      "operational";

    if (critical > 0) {
      status = "critical";
    } else if (warnings > 0) {
      status = "warning";
    }

    return NextResponse.json({
      status,
      hasLiveData,
      openIssues:
        openIssues.length,
      critical,
      warnings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load system status.",
      },
      {
        status: 500,
      }
    );
  }
}