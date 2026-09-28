import { createClient } from "@/lib/supabase/server";
import ConnectionsPageClient from "@/components/ConnectionsPageClient";

export default async function ConnectionsPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const {
    data: integrations,
    error,
  } =
    await supabase
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
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

  if (error) {
    console.error(
      "Connections error:",
      error
    );
  }

  return (
    <ConnectionsPageClient
      userId={user.id}
      initialIntegrations={
        integrations || []
      }
    />
  );
}