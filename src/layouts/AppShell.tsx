"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/firebase/auth/use-user";
import FloatingBottomNav from "@/layouts/BottomNav";
import DesktopSidebarNav from "@/layouts/DesktopSidebar";
import { cn } from "@/lib/utils";
import { getUiNavItems } from "@/lib/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const isAuthenticated = Boolean(user);
  const navItems = getUiNavItems(isAuthenticated);

  // Identify active nav item based on pathname for parity
  const activeNavId = navItems.find(item => pathname.startsWith(item.href))?.id || 'home';

  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    setMounted(true);

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // Exact parity logic from legacy MobileAppLayout.tsx
      if (currentScrollY < lastScrollY.current || currentScrollY < 50) {
        setIsVisible(true);
      } else if (currentScrollY > 100 && currentScrollY > lastScrollY.current) {
        setIsVisible(false);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      router.push('/today');
    }
  };

  if (!mounted) return <div className="min-h-screen bg-[#fafafa]" />;

  const isLanding = pathname === "/";
  const isReader = pathname.includes('/versehub/'); // Equivalent to density='reader'

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#fafafa] dark:bg-[#050505] touch-pan-y">
      {/* Ambient Background Layers (100% legacy parity from app.blade.php) */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[10%] h-[60%] w-[60%] rounded-full bg-indigo-200/20 blur-[120px] dark:bg-indigo-900/10" />
        <div className="absolute -right-[5%] top-[10%] h-[50%] w-[50%] rounded-full bg-sky-200/20 blur-[100px] dark:bg-sky-900/10" />
        <div className="absolute bottom-[10%] left-[20%] h-[40%] w-[40%] rounded-full bg-rose-200/10 blur-[110px] dark:bg-rose-900/5" />
      </div>

      <div
        className={cn(
          "relative z-10 mx-auto w-full max-w-6xl overflow-x-clip px-4",
          isReader ? "py-4 md:py-6" : "py-8"
        )}
      >
        <div className="flex items-start gap-8">
          {/* Desktop Sidebar (Parity with MobileAppLayout.tsx) */}
          {!isLanding && activeNavId && (
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
              isLanding || isReader ? "max-w-none" : "max-w-[420px] md:mx-0 md:max-w-none"
            )}
            style={{
              paddingBottom: 'calc(120px + env(safe-area-inset-bottom))',
            }}
          >
            <main className={cn(isReader ? "mt-4" : "mt-6")}>
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
      {!isLanding && activeNavId && (
        <div
          className="fixed inset-x-0 z-50 flex justify-center md:hidden"
          style={{ bottom: 'calc(24px + env(safe-area-inset-bottom))' }}
        >
          <FloatingBottomNav
            items={navItems}
            activeId={activeNavId}
            onChange={(id) => {
              const href = navItems.find(n => n.id === id)?.href || '/today';
              router.push(href);
            }}
          />
        </div>
      )}
    </div>
  );
}
