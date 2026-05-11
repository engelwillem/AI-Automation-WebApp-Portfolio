"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthSession } from "@/auth/use-auth-session";
import FloatingBottomNav from "@/layouts/BottomNav";
import DesktopSidebarNav from "@/layouts/DesktopSidebar";
import { cn } from "@/lib/utils";
import { getUiNavItems } from "@/lib/navigation";
import { TCTLogo } from "@/components/brand/TCTLogo";
import {
  isAuthSurfacePath,
  isLandingPath,
  isTodayRitualPath,
  isTctAppNavigationPath,
  isVersehubPath,
  isSanctuaryPath,
  requiresAppSession,
} from "@/lib/app-runtime-paths";

import { SanctuaryShell } from "@/features/sanctuary/components/SanctuaryShell";

type ShellIdentity = {
  name: string;
  email: string;
  avatarUrl: string | null;
  initial: string;
  isGuest: boolean;
};

const guestIdentity: ShellIdentity = {
  name: "Guest",
  email: "",
  avatarUrl: null,
  initial: "G",
  isGuest: true,
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isVersehubSheetActive, setIsVersehubSheetActive] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const isVersehubRoute = pathname.startsWith("/versehub/");
    if (!isVersehubRoute) {
      setIsVersehubSheetActive(false);
      return;
    }

    const onVersehubOverlayChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ source?: string; active?: boolean }>;
      if (customEvent.detail?.source !== "versehub") return;
      setIsVersehubSheetActive(Boolean(customEvent.detail?.active));
    };

    window.addEventListener("tct:overlay-activity", onVersehubOverlayChange as EventListener);
    return () => {
      window.removeEventListener("tct:overlay-activity", onVersehubOverlayChange as EventListener);
    };
  }, [mounted, pathname]);

  if (!mounted) return <div className="tct-global-background min-h-screen" />;

  if (!requiresAppSession(pathname)) {
    return (
      <ShellFrame
        activeNavId={null}
        identity={guestIdentity}
        isAuthenticated={false}
        isVersehubSheetActive={isVersehubSheetActive}
        pathname={pathname}
        router={router}
      >
        {children}
      </ShellFrame>
    );
  }

  return (
    <AuthenticatedShell
      isVersehubSheetActive={isVersehubSheetActive}
      pathname={pathname}
      router={router}
    >
      {children}
    </AuthenticatedShell>
  );
}

function AuthenticatedShell({
  children,
  isVersehubSheetActive,
  pathname,
  router,
}: {
  children: React.ReactNode;
  isVersehubSheetActive: boolean;
  pathname: string;
  router: ReturnType<typeof useRouter>;
}) {
  const { identity, isAuthenticated } = useAuthSession();
  const navItems = getUiNavItems(isAuthenticated);
  const activeNavId = navItems.find((item) => pathname.startsWith(item.href))?.id || "today";

  return (
    <ShellFrame
      activeNavId={activeNavId}
      identity={identity}
      isAuthenticated={isAuthenticated}
      isVersehubSheetActive={isVersehubSheetActive}
      pathname={pathname}
      router={router}
    >
      {children}
    </ShellFrame>
  );
}

function ShellFrame({
  activeNavId,
  children,
  identity,
  isAuthenticated,
  isVersehubSheetActive,
  pathname,
  router,
}: {
  activeNavId: string | null;
  children: React.ReactNode;
  identity: ShellIdentity;
  isAuthenticated: boolean;
  isVersehubSheetActive: boolean;
  pathname: string;
  router: ReturnType<typeof useRouter>;
}) {
  const showTctNavigation = isTctAppNavigationPath(pathname);
  const scopedActiveNavId = showTctNavigation ? activeNavId : null;
  const navItems = scopedActiveNavId ? getUiNavItems(isAuthenticated) : [];
  const isTodayRitual = isTodayRitualPath(pathname);
  const isSanctuary = isSanctuaryPath(pathname);
  const isLanding = isLandingPath(pathname);
  const isAuthSurface = isAuthSurfacePath(pathname);
  const isReader = isVersehubPath(pathname);
  const isCommunitySurface = pathname === "/community" || pathname.startsWith("/community/");
  const centerMobileBrand = pathname === "/profile" || pathname === "/community";

  if (isLanding) {
    return (
      <div className="tct-global-background relative min-h-screen overflow-x-hidden text-foreground touch-pan-y">
        {children}
      </div>
    );
  }

  if (isSanctuary) {
    return (
      <SanctuaryShell>
        <div className="relative z-10 mx-auto w-full max-w-7xl px-0 md:px-6 lg:px-8">
          <div className="flex items-start gap-6 lg:gap-8">
            {scopedActiveNavId && (
              <div className="sticky top-6 hidden h-fit align-start md:flex md:w-[248px] md:flex-col md:gap-4 md:pt-6">
                <DesktopSidebarNav
                  activeId={scopedActiveNavId}
                  navItems={navItems}
                  isAuthenticated={isAuthenticated}
                  userName={identity.name}
                  userEmail={identity.email}
                  initials={identity.initial}
                  avatarUrl={identity.avatarUrl}
                  isGuest={identity.isGuest}
                />
              </div>
            )}

            <div className="w-full min-w-0 md:flex-1">
              <div style={{ paddingBottom: "calc(116px + env(safe-area-inset-bottom))" }}>
                {children}
              </div>
            </div>
          </div>
        </div>

        {scopedActiveNavId && (
          <div
            className="pointer-events-none inset-x-0 z-[100] flex justify-center md:hidden"
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: "calc(14px + env(safe-area-inset-bottom))",
            }}
          >
            <div className="pointer-events-auto">
              <FloatingBottomNav
                items={navItems}
                activeId={scopedActiveNavId}
                onChange={(id) => {
                  const targetItem = navItems.find((item) => item.id === id);
                  if (targetItem) {
                    router.push(targetItem.href);
                  }
                }}
              />
            </div>
          </div>
        )}
      </SanctuaryShell>
    );
  }

  return (
    <div className="tct-global-background relative min-h-screen overflow-x-hidden text-foreground touch-pan-y">
      <div
        className={cn(
          "relative z-10 mx-auto w-full px-4",
          isCommunitySurface ? "max-w-[1560px] overflow-visible md:px-6 lg:px-8" : "max-w-6xl overflow-x-clip",
          isReader ? "py-4 md:py-6" : "py-6 md:py-8"
        )}
      >
        <div className="flex items-start gap-8">
          {!isLanding && !isAuthSurface && !isTodayRitual && scopedActiveNavId && (
            <div className="sticky top-8 hidden h-fit align-start md:flex md:w-72 md:flex-col md:gap-4">
              <DesktopSidebarNav
                activeId={scopedActiveNavId}
                navItems={navItems}
                isAuthenticated={isAuthenticated}
                userName={identity.name}
                userEmail={identity.email}
                initials={identity.initial}
                avatarUrl={identity.avatarUrl}
                isGuest={identity.isGuest}
              />
            </div>
          )}

          <div
            className={cn(
              "mx-auto w-full md:flex-1",
              isLanding || isReader || isAuthSurface || isTodayRitual ? "max-w-none" : "max-w-[420px] md:mx-0 md:max-w-none"
            )}
            style={
              isTodayRitual
                ? undefined
                : {
                    paddingBottom: "calc(120px + env(safe-area-inset-bottom))",
                  }
            }
          >
            {!isLanding && !isAuthSurface && !isTodayRitual && !isReader && (
              <div
                className={cn(
                  "mb-4 mt-0 flex items-center md:hidden",
                  centerMobileBrand ? "justify-center" : "justify-between"
                )}
              >
                <div className="flex items-center gap-2 opacity-[0.65]">
                  <TCTLogo className="h-4 w-4 drop-shadow-sm" />
                  <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-foreground">
                    The Chosen Talks
                  </p>
                </div>
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

      {!isLanding && !isAuthSurface && !isTodayRitual && scopedActiveNavId && (
        <div
          className={cn(
            "inset-x-0 z-50 flex justify-center transition-all duration-200 md:hidden",
            isVersehubSheetActive
              ? "pointer-events-none translate-y-10 opacity-0"
              : "pointer-events-auto translate-y-0 opacity-100"
          )}
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: "calc(14px + env(safe-area-inset-bottom))",
          }}
        >
          <FloatingBottomNav
            items={navItems}
            activeId={scopedActiveNavId}
            onChange={(id) => {
              const targetItem = navItems.find((item) => item.id === id);
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
