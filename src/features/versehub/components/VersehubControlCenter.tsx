"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type ControlCenterItem = {
    key: string;
    label: string;
    onClick: () => void;
};

interface VersehubControlCenterProps {
    isVisible: boolean;
    isOpen: boolean;
    items: ControlCenterItem[];
    onToggle: () => void;
}

export function VersehubControlCenter({
    isVisible,
    isOpen,
    items,
    onToggle,
}: VersehubControlCenterProps) {
    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10, transition: { duration: 0.18 } }}
                        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                        className="fixed bottom-[calc(92px+env(safe-area-inset-bottom,24px))] right-4 z-[74] flex flex-col items-end gap-2 md:right-8"
                    >
                        {items.map((item, index) => (
                            <motion.button
                                key={item.key}
                                type="button"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                transition={{ duration: 0.26, delay: index * 0.03 }}
                                onClick={item.onClick}
                                className="min-h-[44px] rounded-full bg-white/80 px-5 py-3 text-[12px] font-semibold text-slate-700 backdrop-blur-2xl ring-1 ring-slate-200/50 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.12)] transition hover:bg-white"
                            >
                                {item.label}
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                type="button"
                initial={false}
                animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                onClick={onToggle}
                className={cn(
                    "fixed bottom-[calc(20px+env(safe-area-inset-bottom,24px))] right-4 z-[75] flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white/90 text-slate-700 backdrop-blur-2xl ring-1 ring-slate-200/60 shadow-[0_8px_30px_-6px_rgba(0,0,0,0.15)] transition hover:bg-white md:right-8 lg:right-12 active:scale-95",
                    !isVisible && "pointer-events-none"
                )}
                aria-label={isOpen ? "Close control center" : "Open control center"}
            >
                <motion.div animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.28 }}>
                    <Plus className="h-5 w-5" />
                </motion.div>
            </motion.button>
        </>
    );
}
