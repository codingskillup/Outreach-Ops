import { createClient } from "@/lib/supabase/server";
import NotesPageClient, { type Note } from "@/components/NotesPageClient";

export default async function NotesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [notesRes, accountsRes] = await Promise.all([
    supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("email_accounts")
      .select("raw_data")
      .eq("user_id", user.id),
  ]);

  const notes = (notesRes.data || []) as Note[];
  const accounts = accountsRes.data || [];

  const clientSet = new Set<string>();

  for (const acc of accounts) {
    const raw = (acc.raw_data || {}) as Record<string, unknown>;
    const clientName =
      (typeof raw.client_name === "string" && raw.client_name.trim()) ||
      (typeof raw.clientName === "string" && raw.clientName.trim()) ||
      (typeof raw.client === "string" && raw.client.trim()) ||
      null;

    if (clientName && clientName.toLowerCase() !== "unassigned") {
      clientSet.add(clientName);
    }
  }

  // Also include any client names already used in existing notes
  for (const n of notes) {
    if (n.client && n.client.trim()) {
      clientSet.add(n.client.trim());
    }
  }

  const availableClients = Array.from(clientSet).sort((a, b) =>
    a.localeCompare(b)
  );

  return (
    <NotesPageClient
      userId={user.id}
      initialNotes={notes}
      availableClients={availableClients}
    />
  );
}