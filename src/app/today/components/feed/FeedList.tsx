'use client';

import { motion, AnimatePresence } from 'framer-motion';
import FeedItemRenderer from './FeedItemRenderer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function FeedList({
    items,
    startIndex = 0,
}: {
    items: any[];
    startIndex?: number;
}) {
    if (items.length === 0 && startIndex === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <Card className="rounded-[32px] border-dashed border-2 bg-transparent shadow-none mt-2 opacity-60">
                    <CardHeader className="pb-3 text-center">
                        <CardTitle className="text-xl font-bold text-foreground">
                            Jadilah yang Pertama Hari Ini
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-center">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-6 max-w-sm mx-auto">
                            Belum ada yang membagikan berkat atau pergumulan murni hari ini. Jangan tunggu yang lain, bagikan apa yang Tuhan taruh di hatimu!
                        </p>
                        <div className="flex justify-center inline-flex w-full">
                            <Button asChild className="w-full sm:w-auto h-12 rounded-xl bg-brand text-brand-foreground hover:opacity-90 font-semibold shadow-soft">
                                <Link href="/community">💬 Tulis Sesuatu Sekarang</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        );
    }

    return (
        <div className="space-y-6">
            <AnimatePresence mode="popLayout">
                {items.map((item, idx) => (
                    <FeedItemRenderer
                        key={item.id}
                        item={item}
                        index={startIndex + idx}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}
