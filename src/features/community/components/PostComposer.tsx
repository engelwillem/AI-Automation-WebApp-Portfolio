"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImagePlus, MessageSquare, Hand, Sparkles, Send, X } from "lucide-react";
import { CommunityUser } from "../types";

type PostType = "user_post" | "prayer_request" | "reflection" | "testimony";

interface PostComposerProps {
  onPost: (text: string, type: PostType, images?: File[]) => void;
  currentUser?: CommunityUser;
  className?: string;
  channels?: Array<{ id: string; slug: string; title: string }>;
}

export function PostComposer({
  onPost,
  currentUser,
  className,
  channels = [],
}: PostComposerProps) {
  const [text, setText] = useState("");
  const [type, setType] = useState<PostType>("user_post");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [layoutVariant, setLayoutVariant] = useState<"standard" | "twitter" | "quote">("standard");

  useEffect(() => {
    const next: Record<string, string> = {};
    images.forEach((file) => {
      const key = `${file.name}-${file.size}-${file.lastModified}`;
      next[key] = URL.createObjectURL(file);
    });
    setPreviewUrls(next);

    return () => {
      Object.values(next).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  const types: { value: PostType; label: string; icon: any }[] = [
    { value: "reflection", label: "Refleksi", icon: Sparkles },
    { value: "prayer_request", label: "Permohonan Doa", icon: Hand },
    { value: "testimony", label: "Kesaksian", icon: MessageSquare },
    { value: "user_post", label: "Pikiran", icon: MessageSquare },
  ];

  const handleSubmit = () => {
    if (!text.trim() && images.length === 0) return;
    setIsSubmitting(true);
    onPost(text, type, images);
    setText("");
    setImages([]);
    setIsExpanded(false);
    setIsSubmitting(false);
  };

  const removeImage = (targetKey: string) => {
    setImages((prev) =>
      prev.filter((file) => `${file.name}-${file.size}-${file.lastModified}` !== targetKey)
    );
  };

  const hasImages = Object.keys(previewUrls).length > 0;
  const initials = (currentUser?.name?.[0] || "Saya").toUpperCase();

  return (
    <Card
      className={cn(
        "rounded-[32px] bg-surface/80 shadow-premium backdrop-blur-3xl border border-border/60 overflow-hidden transition-all duration-500",
        isExpanded ? "ring-2 ring-brand/20 shadow-premium" : "",
        className
      )}
    >
      <CardContent className="p-0">
        <div className="flex flex-col">
          <div className="flex items-center gap-5 px-6 pt-8 pb-3">
            <div className="relative group">
              <div className="absolute -inset-1.5 rounded-full bg-brand/30 opacity-30 blur-md transition duration-500 group-hover:opacity-60" />
              <div className="relative h-14 w-14 shrink-0 rounded-full bg-surface-muted flex items-center justify-center overflow-hidden shadow-inner border border-border/60">
                {currentUser?.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt={currentUser.name} className="h-full w-full object-cover" />
                ) : (
                  <>
                    <div className="bg-brand/15 absolute inset-0" />
                    <div className="relative text-brand text-[13px] font-black tracking-[0.15em] uppercase select-none">
                      {initials}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-[22px] font-black tracking-tight leading-loose bg-clip-text text-transparent bg-gradient-to-r from-foreground via-brand to-foreground">
                  Berbagi Berkat
                </h2>
                <div className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse shadow-[0_0_10px_rgba(0,166,255,0.8)]" />
              </div>
              <p className="mt-0.5 text-[14px] font-bold tracking-tight text-muted-foreground opacity-70">
                Bagikan terang yang Anda terima hari ini
              </p>
            </div>
            <Sparkles className="h-6 w-6 text-brand/20 animate-pulse" />
          </div>

          <div className="px-6">
            <textarea
              className={cn(
                "w-full bg-transparent border-none focus:ring-0 px-0 py-4 leading-relaxed text-foreground placeholder:text-muted-foreground resize-none transition-all duration-500 outline-none",
                layoutVariant === "twitter" ? "text-[22px] font-black italic md:text-[24px]" : "text-[17px] font-medium"
              )}
              placeholder={layoutVariant === "quote" ? "Tulis ayat atau kutipan..." : "Apa yang Tuhan taruh di hati Anda?"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => setIsExpanded(true)}
              rows={isExpanded ? 4 : 1}
            />
          </div>

          {hasImages && (
            <div className="px-6 pb-4 flex flex-col gap-3">
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {Object.entries(previewUrls).map(([key, url]) => (
                  <div
                    key={key}
                    className={cn(
                      "relative shrink-0 overflow-hidden rounded-2xl shadow-lg ring-1 ring-border/60 transition-all duration-300 w-32 aspect-[4/5]"
                    )}
                  >
                    <img src={url} alt="preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md shadow-md hover:bg-black/80 transition-colors"
                      onClick={() => removeImage(key)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isExpanded && (
            <div className="flex flex-col border-t border-border/70 bg-surface-muted/60 backdrop-blur-xl transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
              {!hasImages && (
                <div className="flex items-center gap-2 px-6 py-3 border-b border-border/70">
                  <button
                    onClick={() => setLayoutVariant("standard")}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                      layoutVariant === "standard"
                        ? "bg-brand text-brand-foreground shadow-md"
                        : "bg-surface text-muted-foreground"
                    )}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => setLayoutVariant("twitter")}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                      layoutVariant === "twitter"
                        ? "bg-brand/10 text-brand ring-1 ring-brand/20"
                        : "bg-surface text-muted-foreground"
                    )}
                  >
                    Twitter Style
                  </button>
                  <button
                    onClick={() => {
                      setLayoutVariant("quote");
                      setType("reflection");
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                      layoutVariant === "quote"
                        ? "bg-brand/10 text-brand ring-1 ring-brand/20"
                        : "bg-surface text-muted-foreground"
                    )}
                  >
                    Classy Quote
                  </button>
                </div>
              )}

              <div className="relative group flex items-center px-4 py-4 border-b border-border/70 overflow-hidden">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide px-2">
                  {types.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setType(t.value)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-full text-[12px] font-bold transition-all whitespace-nowrap shrink-0 tct-pressable shadow-sm border border-transparent",
                        type === t.value
                          ? "bg-brand text-brand-foreground ring-2 ring-brand/20 ring-offset-2 ring-offset-background shadow-lg scale-105"
                          : "text-muted-foreground bg-surface hover:bg-surface-elevated border-border/70"
                      )}
                    >
                      <t.icon size={14} className="opacity-100" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4">
                <div className="flex items-center gap-3">
                  <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-2xl bg-surface px-4 text-[12px] font-bold text-foreground shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:scale-105 transition-transform active:scale-95">
                    <ImagePlus className="h-5 w-5 text-brand" />
                    <span>Media</span>
                    <input
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        if (!files.length) return;
                        setIsExpanded(true);
                        setImages((prev) => [...prev, ...files].slice(0, 10));
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full px-5 h-11 font-bold text-muted-foreground"
                    onClick={() => setIsExpanded(false)}
                  >
                    Batal
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-2xl px-8 h-11 font-bold bg-brand text-brand-foreground shadow-[0_8px_20px_rgba(0,166,255,0.25)] hover:scale-[1.05] active:scale-[0.95] transition-all"
                    onClick={handleSubmit}
                    disabled={(!text.trim() && images.length === 0) || isSubmitting}
                  >
                    {isSubmitting ? "..." : (
                      <div className="flex items-center gap-2">
                        <span>Bagikan</span>
                        <Send size={15} />
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
