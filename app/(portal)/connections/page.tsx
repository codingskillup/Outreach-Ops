import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConnectionsPageClient from "@/components/ConnectionsPageClient";

export default async function ConnectionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: integrations } = await supabase
    .from("integrations")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <ConnectionsPageClient
      userId={user.id}
      initialIntegrations={integrations || []}
    />
  );
}