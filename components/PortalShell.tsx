"use client";

import { useState } from "react";
import PortalSidebar from "@/components/PortalSidebar";
import PortalHeader from "@/components/PortalHeader";

export default function PortalShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-slate-900 antialiased selection:bg-[#2563EB] selection:text-white">
      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/70 z-45 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Responsive Sidebar (Fixed on Desktop, Drawer on Mobile) */}
      <PortalSidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Layout Container */}
      <div className="lg:pl-[260px] min-h-screen flex flex-col transition-all duration-200">
        <PortalHeader
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        />

        <main className="pt-20 sm:pt-24 px-3 sm:px-5 lg:px-4 xl:px-6 pb-14 flex-1 w-full max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
