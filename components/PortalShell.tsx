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
    <div className="min-h-[100dvh] bg-[#F4F7FB] text-slate-900 antialiased selection:bg-[#2563EB] selection:text-white flex flex-col">
      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-45 lg:hidden transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Responsive Sidebar (Fixed on Desktop, Drawer on Mobile) */}
      <PortalSidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Layout Container */}
      <div className="lg:pl-[275px] min-h-[100dvh] flex flex-col flex-1 transition-all duration-200">
        <PortalHeader
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        />

        <main className="pt-[76px] sm:pt-24 px-3 sm:px-5 lg:px-6 pb-16 flex-1 w-full max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
