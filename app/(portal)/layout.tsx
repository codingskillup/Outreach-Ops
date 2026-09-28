import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PortalSidebar from "@/components/PortalSidebar";
import PortalHeader from "@/components/PortalHeader";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F5F7FA",
      }}
    >
      <PortalSidebar />

      <div
        style={{
          marginLeft: 250,
          minHeight: "100vh",
        }}
      >
        <PortalHeader />

        <main
          style={{
            padding: 28,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}