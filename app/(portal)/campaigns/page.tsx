import { createClient } from "@/lib/supabase/server";
import CampaignsPageClient from "@/components/CampaignsPageClient";

export default async function CampaignsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const {
    data: campaigns,
    error,
  } = await supabase
    .from("campaigns")
    .select(`
      id,
      external_id,
      name,
      status,
      first_seen_active_at,
      raw_data,
      synced_at,
      integration_id,
      integrations (
        id,
        name,
        provider
      )
    `)
    .eq("user_id", user.id)
    .order("name", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Campaigns error:",
      error
    );
  }

  return (
    <CampaignsPageClient
      realCampaigns={campaigns || []}
    />
  );
}