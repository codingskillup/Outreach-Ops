import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettingsPageClient from "@/components/SettingsPageClient";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [integrationsResult, recipientsResult] = await Promise.all([
    supabase
      .from("integrations")
      .select(`
        id,
        provider,
        name,
        status,
        api_key_last4,
        last_synced_at,
        created_at
      `)
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("notification_recipients")
      .select(`
        id,
        email,
        instant_issue_alert,
        daily_report,
        is_active,
        created_at
      `)
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: true,
      }),
  ]);

  return (
    <SettingsPageClient
      userId={user.id}
      integrations={integrationsResult.data || []}
      recipients={recipientsResult.data || []}
    />
  );
}