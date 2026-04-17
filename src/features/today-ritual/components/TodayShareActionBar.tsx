"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Check, Copy, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { AppIcon } from "@/features/community/components/AppIcon";
import {
  buildWhatsAppShareUrl,
  copyToClipboard,
  getCanonicalUrl,
} from "@/lib/share";
import { ensureShareAssetReady, type ShareSurface } from "@/lib/share-assets";

type TodayShareActionBarProps = {
  sharePath?: string;
  shareText: string;
  isAuthenticated?: boolean;
  isRestoring?: boolean;
  resolveSharePath?: () => Promise<string | null>;
  onBookmark?: () => Promise<boolean> | boolean;
  surface?: ShareSurface;
};

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M19.05 4.94A9.87 9.87 0 0 0 12.03 2 9.94 9.94 0 0 0 2.1 11.95c0 1.74.46 3.44 1.34 4.94L2 22l5.28-1.38a9.9 9.9 0 0 0 4.74 1.2h.01a9.95 9.95 0 0 0 9.94-9.94 9.83 9.83 0 0 0-2.92-6.94ZM12.03 20.1h-.01a8.19 8.19 0 0 1-4.18-1.14l-.3-.18-3.14.83.84-3.06-.2-.31a8.2 8.2 0 0 1-1.25-4.33 8.24 8.24 0 0 1 8.24-8.24 8.15 8.15 0 0 1 5.83 2.42 8.21 8.21 0 0 1 2.41 5.83 8.24 8.24 0 0 1-8.24 8.18Zm4.52-6.18c-.25-.13-1.46-.72-1.69-.81-.23-.08-.4-.12-.58.12-.16.25-.64.81-.78.98-.14.16-.29.18-.54.06-.25-.13-1.03-.38-1.96-1.2-.72-.64-1.2-1.43-1.35-1.67-.14-.25-.01-.38.1-.51.11-.11.25-.29.36-.43.12-.14.16-.24.25-.41.08-.16.04-.31-.02-.43-.07-.13-.57-1.37-.78-1.88-.21-.5-.42-.43-.58-.44h-.5c-.16 0-.43.07-.65.31-.22.25-.86.84-.86 2.05s.88 2.38 1 2.55c.13.16 1.72 2.62 4.16 3.67.58.25 1.04.41 1.4.52.58.18 1.1.16 1.51.1.46-.06 1.46-.6 1.67-1.18.2-.58.2-1.07.14-1.17-.05-.09-.22-.16-.47-.29Z"
      />
    </svg>
  );
}

export default function TodayShareActionBar({
  sharePath = "/renungan",
  shareText,
  isAuthenticated = false,
  isRestoring = false,
  resolveSharePath,
  onBookmark,
  surface = "renungan",
}: TodayShareActionBarProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resolvedSharePath, setResolvedSharePath] = useState<string | null>(null);
  const shareUrl = useMemo(() => getCanonicalUrl(resolvedSharePath || sharePath), [resolvedSharePath, sharePath]);

  const guardMemberAction = (action: () => void | Promise<void>) => {
    if (isRestoring) return;
    if (!isAuthenticated) {
      router.push('/login?next=/renungan');
      return;
    }

    void action();
  };

  const resolveShareUrl = async (): Promise<string> => {
    if (!resolveSharePath) return shareUrl;
    const nextPath = await resolveSharePath();
    if (nextPath) {
      setResolvedSharePath(nextPath);
      return getCanonicalUrl(nextPath);
    }
    return shareUrl;
  };

  const onShareWhatsApp = () => {
    void (async () => {
      setIsGenerating(true);
      try {
        const nextShareUrl = await resolveShareUrl();
        
        // Attempt to extract subjectId for AI preparation
        const pathSegments = nextShareUrl.split("/").filter(Boolean);
        const subjectId = pathSegments.pop();

        if (subjectId && surface) {
          try {
            const prepared = await ensureShareAssetReady(surface, subjectId);
            if (prepared?.shareUrl) {
              const waUrl = buildWhatsAppShareUrl(`${shareText} ${prepared.shareUrl}`);
              window.open(waUrl, "_blank", "noopener,noreferrer");
              return;
            }
          } catch (err) {
            console.warn("[share] AI preparation failed, falling back to basic URL", err);
          }
        }

        // Fallback to basic URL
        const waUrl = buildWhatsAppShareUrl(`${shareText} ${nextShareUrl}`);
        window.open(waUrl, "_blank", "noopener,noreferrer");
      } finally {
        setIsGenerating(false);
      }
    })();
  };

  const onCopyLink = async () => {
    const nextShareUrl = await resolveShareUrl();
    const ok = await copyToClipboard(`${shareText} ${nextShareUrl}`);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const onSaveBookmark = async () => {
    if (!onBookmark || isSaving || bookmarked) return;
    setIsSaving(true);
    try {
      const result = await onBookmark();
      if (result) {
        setBookmarked(true);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-8 rounded-full border border-slate-200/80 bg-white/88 p-2 shadow-[0_14px_30px_-22px_rgba(15,23,42,0.35)]">
      <div className="flex items-center justify-start gap-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={() => guardMemberAction(onSaveBookmark)}
          disabled={isRestoring || !onBookmark || bookmarked || isSaving}
          aria-label={bookmarked ? "Bookmarked" : isSaving ? "Menyimpan bookmark" : "Bookmark"}
          aria-pressed={bookmarked}
          className={cn(
            "tct-pressable inline-flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200",
            bookmarked
              ? "bg-brand/10 text-brand ring-1 ring-inset ring-brand/20"
              : "bg-surface-muted/70 text-muted-foreground hover:bg-surface-muted hover:text-foreground",
            (isRestoring || !onBookmark || bookmarked || isSaving) ? "opacity-60" : ""
          )}
        >
          {bookmarked ? (
            <AppIcon icon={Check} variant="action" className="text-brand" />
          ) : (
            <AppIcon icon={Bookmark} variant="action" active={bookmarked} className={bookmarked ? "text-brand" : "opacity-70"} />
          )}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={() => guardMemberAction(onCopyLink)}
          disabled={isRestoring}
          aria-label={copied ? "Teks renungan tersalin" : "Salin renungan"}
          className={cn(
            "tct-pressable inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted/70 text-muted-foreground transition-colors duration-200 hover:bg-surface-muted hover:text-foreground",
            isRestoring ? "opacity-60" : ""
          )}
        >
          {copied ? (
            <AppIcon icon={Check} variant="action" className="text-brand" />
          ) : (
            <AppIcon icon={Copy} variant="action" className="opacity-70" />
          )}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={() => guardMemberAction(onShareWhatsApp)}
          disabled={isRestoring || isGenerating}
          aria-label={isGenerating ? "Menyiapkan kartu bagikan..." : "Bagikan renungan ke WhatsApp"}
          className={cn(
            "tct-pressable relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#eafaf0] text-[#25D366] transition-colors duration-200 hover:bg-[#dcf8e6] hover:text-[#1fa855]",
            (isRestoring || isGenerating) ? "opacity-60" : ""
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isGenerating ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <Loader2 className="h-[18px] w-[18px] animate-spin text-[#1fa855]" />
              </motion.div>
            ) : (
              <motion.div
                key="wa-icon"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <WhatsAppIcon className="h-[18px] w-[18px]" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}
