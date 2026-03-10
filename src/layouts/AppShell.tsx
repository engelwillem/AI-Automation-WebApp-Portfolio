"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Background } from "@/components/core/Background";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLanding = pathname === "/";

  // Render the background immediately to avoid a white flash,
  // but only animate elements after mounting to prevent hydration mismatches.
  return (
    <div className="relative min-h-screen bg-[#020617] text-white overflow-x-hidden flex flex-col">
      <Background />
      
      <div className="relative z-10 flex flex-col flex-1">
        <main className="flex-1">
          {mounted ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="h-full w-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="h-full w-full opacity-0">
              {children}
            </div>
          )}
        </main>

        {mounted && !isLanding && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-6 md:hidden">
            <BottomNav />
          </div>
        )}
      </div>
    </div>
  );
}
