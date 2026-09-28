import { createClient } from "@/lib/supabase/server";
import NotesPageClient from "@/components/NotesPageClient";

export default async function NotesPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  const { data: notes } =
    await supabase
      .from("notes")
      .select("*")
      .order(
        "is_pinned",
        {
          ascending: false,
        }
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

  return (
    <NotesPageClient
      userId={user!.id}
      initialNotes={
        notes || []
      }
    />
  );
}