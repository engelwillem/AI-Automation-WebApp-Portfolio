"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthSession } from "@/auth/use-auth-session";
import FloatingBottomNav from "@/layouts/BottomNav";
import DesktopSidebarNav from "@/layouts/DesktopSidebar";
import { cn } from "@/lib/utils";
import { getUiNavItems } from "@/lib/navigation";
import { TCTLogo } from "@/components/brand/TCTLogo";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthSession();
  const navItems = getUiNavItems(isAuthenticated);

  const activeNavId = navItems.find(item => pathname.startsWith(item.href))?.id || 'today';

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="tct-global-background min-h-screen" />;

  const isLanding = pathname === "/";
  const isAuthSurface = pathname === "/login" || pathname === "/forgot-password" || pathname === "/reset-password";
  const isReader = pathname.includes('/versehub/');
  // Full-screen routes manage their own layout — shell provides no columns or padding
  const isTodayRitual = pathname === '/today';
  // Landing renders its own full-viewport layout
  const isFullBleed = isLanding;

  if (isFullBleed) {
    return (
      <div className="tct-global-background relative min-h-screen overflow-x-hidden text-foreground touch-pan-y">
        {children}
      </div>
    );
  }

  if (isTodayRitual) {
    return (
      <div className="tct-global-background relative min-h-screen overflow-x-hidden text-foreground touch-pan-y">
        <div className="relative z-10 mx-auto w-full max-w-7xl px-0 md:px-6 lg:px-8">
          <div className="flex items-start gap-6 lg:gap-8">
            {activeNavId && (
              <div className="hidden md:flex md:w-[248px] md:flex-col md:gap-4 md:pt-6 sticky top-6 h-fit align-start">
                <DesktopSidebarNav
                  activeId={activeNavId}
                  navItems={navItems}
                  isAuthenticated={isAuthenticated}
                  userName={user?.displayName || ''}
                  userEmail={user?.email || ''}
                  initials={user?.displayName?.slice(0, 1).toUpperCase() || 'U'}
                />
              </div>
            )}

            <div className="w-full min-w-0 md:flex-1">
              <div style={{ paddingBottom: 'calc(116px + env(safe-area-inset-bottom))' }}>
                {children}
              </div>
            </div>
          </div>
        </div>

        {activeNavId && (
          <div
            className="inset-x-0 z-[100] flex justify-center pointer-events-none md:hidden"
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 'calc(14px + env(safe-area-inset-bottom))',
            }}
          >
            <div className="pointer-events-auto">
              <FloatingBottomNav
                items={navItems}
                activeId={activeNavId}
                onChange={(id) => {
                  const targetItem = navItems.find(n => n.id === id);
                  if (targetItem) {
                    router.push(targetItem.href);
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="tct-global-background relative min-h-screen overflow-x-hidden text-foreground touch-pan-y">


      <div
        className={cn(
          "relative z-10 mx-auto w-full max-w-6xl overflow-x-clip px-4",
          isReader ? "py-4 md:py-6" : isTodayRitual ? "p-0" : "py-6 md:py-8"
        )}
      >
        <div className="flex items-start gap-8">
          {/* Desktop Sidebar (Parity with MobileAppLayout.tsx) */}
          {!isLanding && !isAuthSurface && !isTodayRitual && activeNavId && (
            <div className="hidden md:flex md:w-72 md:flex-col md:gap-4 sticky top-8 h-fit align-start">
              <DesktopSidebarNav
                activeId={activeNavId}
                navItems={navItems}
                isAuthenticated={isAuthenticated}
                userName={user?.displayName || ''}
                userEmail={user?.email || ''}
                initials={user?.displayName?.slice(0, 1).toUpperCase() || 'U'}
              />
            </div>
          )}

          {/* Main Content Column */}
          <div
            className={cn(
              "w-full md:flex-1 mx-auto",
              isLanding || isReader || isAuthSurface || isTodayRitual ? "max-w-none" : "max-w-[420px] md:mx-0 md:max-w-none"
            )}
            style={isTodayRitual ? undefined : {
              paddingBottom: 'calc(120px + env(safe-area-inset-bottom))',
            }}
          >
            {/* Mobile Brand Header */}
            {!isLanding && !isAuthSurface && !isTodayRitual && !isReader && (
              <div className="md:hidden flex items-center justify-center gap-2 mb-4 mt-0 opacity-[0.65]">
                  <TCTLogo className="w-4 h-4 drop-shadow-sm" />
                  <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-foreground mt-0.5">
                      The Chosen Talks
                  </p>
              </div>
            )}

            <main className={cn(isReader ? "mt-4" : isAuthSurface || isTodayRitual ? "mt-0" : "mt-2 md:mt-6")}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="relative z-20"
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>
      </div>

      {/* Floating Mobile Nav (Parity with MobileAppLayout.tsx) */}
      {!isLanding && !isAuthSurface && !isTodayRitual && activeNavId && (
        <div
          className="inset-x-0 z-50 flex justify-center md:hidden"
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 'calc(14px + env(safe-area-inset-bottom))',
          }}
        >
          <FloatingBottomNav
            items={navItems}
            activeId={activeNavId}
            onChange={(id) => {
              const targetItem = navItems.find(n => n.id === id);
              if (targetItem) {
                router.push(targetItem.href);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
