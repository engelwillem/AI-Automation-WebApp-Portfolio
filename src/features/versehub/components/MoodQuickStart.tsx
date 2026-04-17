"use client";

import { motion } from "framer-motion";
import type { MoodQuickStartOption } from "@/features/versehub/types";

interface MoodQuickStartProps {
    options: MoodQuickStartOption[];
    activeMood: string;
    onSelect: (moodKey: string) => void;
}

export function MoodQuickStart({
    options,
    activeMood,
    onSelect,
}: MoodQuickStartProps) {
    return (
        <div className="mt-10">
            <p className="tct-serif text-[22px] font-medium leading-none tracking-tight text-[#2F261A]">
                apa kabarnya hari ini?
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                {options.map((option) => {
                    const isActive = option.key === activeMood;
                    return (
                        <motion.button
                            key={option.key}
                            type="button"
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.92 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            onClick={() => onSelect(option.key)}
                            className={[
                                "rounded-full px-5 py-[12px] text-[15px] font-medium transition-colors ring-1 outline-none",
                                isActive
                                    ? "bg-white text-[#2F261A] ring-[#E7DDCC] shadow-[0_12px_30px_-18px_rgba(47,38,26,0.38)]"
                                    : "bg-white/80 text-[#5F5446] ring-[#EDE3D2] shadow-[0_10px_24px_-20px_rgba(47,38,26,0.25)] hover:bg-white hover:text-[#2F261A] hover:ring-[#E2D6C2]",
                            ].join(" ")}
                            title={option.description}
                        >
                            <span>{option.label}</span>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}
