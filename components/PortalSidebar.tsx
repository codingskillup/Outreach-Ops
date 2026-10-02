"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  LayoutDashboard,
  Users,
  Mail,
  Megaphone,
  Globe,
  TriangleAlert,
  Activity,
  StickyNote,
  Settings,
  LogOut,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

const menuItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Clients",
    href: "/clients",
    icon: Users,
  },
  {
    name: "Email Accounts",
    href: "/emailaccounts",
    icon: Mail,
  },
  {
    name: "Campaigns",
    href: "/campaigns",
    icon: Megaphone,
  },
  {
    name: "Domains",
    href: "/domains",
    icon: Globe,
  },
  {
    name: "Issues",
    href: "/issues",
    icon: TriangleAlert,
  },
  {
    name: "Activity",
    href: "/activity",
    icon: Activity,
  },
  {
    name: "Notes",
    href: "/notes",
    icon: StickyNote,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export default function PortalSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();

    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      style={{
        width: 250,
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        background: "#0F172A",
        padding: 20,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        zIndex: 50,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 34,
        }}
      >
        <Link
          href="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 11,
              background: "#FFFFFF",
              color: "#0F172A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 19,
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            O
          </div>

          <div>
            <div
              style={{
                color: "#FFFFFF",
                fontSize: 17,
                fontWeight: 700,
              }}
            >
              Outreach Ops
            </div>

            <div
              style={{
                color: "#94A3B8",
                fontSize: 12,
                marginTop: 3,
              }}
            >
              Infrastructure Monitor
            </div>
          </div>
        </Link>
      </div>

      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 7,
          flex: 1,
        }}
      >
        {menuItems.map((item) => {
          const Icon = item.icon;

          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 13px",
                borderRadius: 10,
                background: active ? "#1E293B" : "transparent",
                color: active ? "#FFFFFF" : "#CBD5E1",
                fontSize: 14,
                fontWeight: active ? 600 : 500,
              }}
            >
              <Icon size={18} />

              {item.name}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleLogout}
        style={{
          width: "100%",
          border: 0,
          background: "transparent",
          color: "#CBD5E1",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 13px",
          cursor: "pointer",
          fontSize: 14,
          borderRadius: 10,
        }}
      >
        <LogOut size={18} />

        Sign Out
      </button>
    </aside>
  );
}