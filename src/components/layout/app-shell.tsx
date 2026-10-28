"use client";

import { usePathname } from "next/navigation";
import AppHeader from "@/components/header/app-header";
import SideNav from "@/components/sidenav/side-nav";
import { MobileHeader } from "@/components/layout/mobile-header";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { ThemeToggle } from "@/components/ui/mode-toggle";

const AUTH_ROUTES = new Set([
  "/",
  "/app",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/resend-verification",
  "/verify-email",
  "/offline",
  "/onboarding",
  "/terms",
  "/privacy",
]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = AUTH_ROUTES.has(pathname) || pathname.startsWith('/offline/');
  const isExternalRoute = pathname.startsWith('/day-sheet-invite/') || pathname.startsWith('/external-day-sheets') || pathname.startsWith('/collaborator-access');
  const isAgentRoute = pathname === '/agent' || pathname.startsWith('/agent/') || pathname.startsWith('/agent-band-invite/');

  if (isAuthRoute || isExternalRoute || isAgentRoute) {
    return (
      <div className="relative min-h-screen bg-bg-primary">
        {children}
        {pathname !== "/" && !AUTH_ROUTES.has(pathname) && !isExternalRoute && <span className="fixed bottom-2.5 right-[2%]"><ThemeToggle /></span>}
      </div>
    );
  }

  return (
    <div className="flex h-screen h-[100dvh] flex-col bg-bg-primary">
      <div className="sticky top-0 z-50 w-full">
        <AppHeader />
        <MobileHeader />
      </div>
      <div className="flex w-full flex-1 overflow-hidden">
        <SideNav />
        <main className="mobile-content-safe w-full flex-1 overflow-x-hidden overflow-y-auto bg-bg-primary">
          {children}
        </main>
      </div>
      <MobileNavigation />
    </div>
  );
}
