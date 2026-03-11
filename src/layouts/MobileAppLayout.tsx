'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

// Mock icons for placeholder (until AppIcons are ported)
const IconChevronLeft = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m15 18-6-6 6-6"/>
  </svg>
);

type MobileAppLayoutProps = {
    title: string;
    activeNavId?: string;
    backHref?: string;
    header?: React.ReactNode;
    rightAction?: React.ReactNode;
    desktopSidebarExtra?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    density?: 'default' | 'reader';
    bottomNavVariant?: 'ultra-subtle' | 'high-contrast';
};

export default function MobileAppLayout({
    title,
    activeNavId,
    backHref = '/today',
    header,
    rightAction,
    desktopSidebarExtra,
    children,
    className,
    density = 'default',
    bottomNavVariant = 'ultra-subtle',
}: MobileAppLayoutProps) {
    const router = useRouter();
    const [isVisible, setIsVisible] = useState(true);
    const lastScrollY = useRef(0);

    const handleBack = () => {
        if (window.history.length > 1) {
            window.history.back();
            return;
        }
        router.push(backHref);
    };

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
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

    return (
        <div className="relative w-full">

            <div
                className={cn(
                    'relative z-10 w-full',
                    density === 'reader' ? 'py-4 md:py-6' : 'py-2',
                )}
            >
                <div className="flex flex-col w-full">
                    <div
                        className={cn(
                            'w-full mx-auto md:mx-0 md:max-w-none',
                            className,
                        )}
                        style={{
                            paddingBottom: 'calc(120px + env(safe-area-inset-bottom))',
                        }}
                    >
                        {header ? (
                            <motion.div
                                initial={false}
                                animate={{ y: isVisible ? 0 : -100, opacity: isVisible ? 1 : 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="sticky top-0 z-40 bg-surface-muted/80 backdrop-blur-sm md:static md:bg-transparent md:backdrop-blur-none"
                            >
                                {header}
                            </motion.div>
                        ) : title ? (
                            <motion.header
                                initial={false}
                                animate={{ y: isVisible ? 0 : -80, opacity: isVisible ? 1 : 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="sticky top-0 z-40 flex items-center justify-between bg-surface-muted/80 py-2 backdrop-blur-sm md:static md:bg-transparent md:backdrop-blur-none"
                            >
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="flex h-12 w-12 items-center justify-center rounded-full bg-surface shadow-soft tertiary"
                                    aria-label="Back"
                                >
                                    <IconChevronLeft className="h-5 w-5" />
                                </button>
                                <h1 className="tct-brand-gradient text-lg font-semibold">{title}</h1>
                                <div className="flex h-12 w-12 items-center justify-center">{rightAction}</div>
                            </motion.header>
                        ) : null}

                        <main className={cn(density === 'reader' ? 'mt-4' : 'mt-6')}>
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="relative z-20"
                            >
                                {children}
                            </motion.div>
                        </main>
                    </div>
                </div>
            </div>
        </div>
    );
}
