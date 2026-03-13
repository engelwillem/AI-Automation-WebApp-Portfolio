"use client";

import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostComposer } from "../components/PostComposer";
import { MemberPostCard } from "../components/MemberPostCard";
import { VerseHubFeaturedCard, type FeaturedVerse } from "../components/VerseHubFeaturedCard";
import { CommunityPost, CommunityUser } from "../types";
import { Loader2, ChevronDown, Inbox } from "lucide-react";
import { CommunityService } from "@/services/community.service";
import { MOCK_USERS } from "../mock";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";

type ArchiveCategory = "all" | "quotes" | "reflections" | "prayer_requests" | "testimonies";

export function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [activeTab, setActiveTab] = useState<"discussions" | "archive" | "bookmarks">("discussions");
  const [archiveCategory, setArchiveCategory] = useState<ArchiveCategory>("all");
  const [isLoading, setIsLoading] = useState(true);
  const currentUser: CommunityUser = MOCK_USERS.me;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const fetchedPosts = await CommunityService.listPosts();
        setPosts(fetchedPosts);
      } catch (error) {
        console.error("Failed to fetch community data", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handlePost = async (text: string, type: string) => {
    try {
      const newPost = await CommunityService.createPost(text);
      // In a real app, we'd send the type too. For now, we update local state with the type for parity.
      const postWithType = { ...newPost, type };
      setPosts((prev) => [postWithType, ...prev]);
    } catch (error) {
      console.error("Failed to create post", error);
    }
  };

  const toggleLike = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, isLiked: !p.isLiked, counts: { ...p.counts, likes: p.counts.likes + (p.isLiked ? -1 : 1) } }
          : p
      )
    );
  };

  const toggleBookmark = async (postId: string) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, isBookmarked: !p.isBookmarked } : p)));
  };

  const featuredPost = useMemo(() => posts.find((p) => p.isFeatured), [posts]);
  
  const effectiveFeaturedVerse = useMemo((): FeaturedVerse => {
    if (featuredPost?.metadata?.ref) {
      return {
        ref: featuredPost.metadata.ref,
        href: `/versehub/id/${featuredPost.metadata.ref}`,
        text: featuredPost.metadata.quote || featuredPost.text,
        reference: featuredPost.metadata.reference || "Daily Verse",
      };
    }
    return {
      ref: "mazmur-23-1",
      href: "/versehub/id/mazmur-23-1",
      text: "TUHAN adalah gembalaku, takkan kekurangan aku.",
      reference: "Mazmur 23:1",
    };
  }, [featuredPost]);

  const archiveGroups = useMemo(() => {
    const filtered = posts.filter((post) => {
      if (archiveCategory === "all") return true;
      const typeMapping: Record<string, string> = {
        quotes: "quote",
        reflections: "reflection",
        prayer_requests: "prayer_request",
        testimonies: "testimony",
      };
      return post.type === (typeMapping[archiveCategory] ?? archiveCategory);
    });

    const map = new Map<string, CommunityPost[]>();
    const todayKey = new Date().toISOString().slice(0, 10);

    filtered.forEach((p) => {
      const dateKey = p.createdAt.slice(0, 10);
      const key = dateKey === todayKey ? "today" : `month-${dateKey.slice(0, 7)}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });

    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, items]) => ({
        key,
        label: key === "today" ? "Hari Ini" : key.replace("month-", ""),
        items: items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      }));
  }, [posts, archiveCategory]);

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-1000">
      <header className="p-8 pb-4 space-y-2">
        <h2 className="text-3xl font-black tracking-tight text-brand">Komunitas</h2>
        <p className="text-sm font-bold tracking-wide leading-relaxed text-muted-foreground">
          Tempat berbagi inspirasi, doa, dan pertumbuhan bersama.
        </p>
      </header>

      <div className="mx-auto w-full max-w-[640px] space-y-4 px-6 pb-28">
        <VerseHubFeaturedCard 
            verse={effectiveFeaturedVerse} 
            postId={featuredPost?.id}
        />

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
          <div className="sticky top-0 z-40 py-2 -mx-1 px-1">
            <TabsList className="relative flex h-[52px] w-full items-center justify-between rounded-[20px] bg-surface-muted/70 p-1.5 backdrop-blur-2xl shadow-inner ring-1 ring-border/70 overflow-hidden">
              {[
                { id: "discussions", label: "Diskusi" },
                { id: "archive", label: "Arsip" },
                { id: "bookmarks", label: "Simpanan" },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    "relative flex-1 h-full rounded-[14px] text-[13px] font-black uppercase tracking-widest transition-all duration-300 z-10",
                    "data-[state=active]:bg-surface data-[state=active]:text-foreground",
                    "data-[state=inactive]:text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="discussions" className="space-y-6 mt-0">
            <PostComposer onPost={handlePost} currentUser={currentUser} />

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="animate-spin mb-4 text-brand" size={32} />
                <p className="text-xs font-bold uppercase tracking-widest opacity-50">Memperbarui Feed...</p>
              </div>
            ) : posts.length ? (
              posts.map((p) => (
                <MemberPostCard
                  key={p.id}
                  authorName={p.author.name}
                  authorAvatar={p.author.avatarUrl}
                  isOfficial={p.author.isOfficial}
                  type={p.type}
                  text={p.text}
                  imgSrc={p.imageUrl}
                  mediaSrcList={p.mediaPaths}
                  prayLabel={String(p.counts.likes)}
                  prayed={p.isLiked}
                  commentsCount={p.counts.comments}
                  bookmarked={p.isBookmarked}
                  bookmarkLabel={String(p.counts.bookmarks)}
                  onPray={() => toggleLike(p.id)}
                  onBookmark={() => toggleBookmark(p.id)}
                  onOpenComments={() => {}}
                  onShare={() => {}}
                />
              ))
            ) : (
              <Card className="rounded-[32px] bg-surface/80 border-none shadow-card">
                <CardContent className="p-12 text-center space-y-2">
                  <p className="text-xl font-bold text-muted-foreground">Belum ada diskusi aktif.</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                    Mulai percakapan hari ini
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="archive" className="space-y-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {[
                { key: "all", label: "Semua" },
                { key: "quotes", label: "Quotes" },
                { key: "reflections", label: "Refleksi" },
                { key: "prayer_requests", label: "Doa" },
                { key: "testimonies", label: "Kesaksian" },
              ].map((item) => {
                const active = archiveCategory === (item.key as ArchiveCategory);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setArchiveCategory(item.key as ArchiveCategory)}
                    className={cn(
                      "whitespace-nowrap rounded-full px-5 py-2 text-[11px] font-black uppercase tracking-wider transition-all",
                      active
                        ? "bg-brand text-brand-foreground shadow-lg"
                        : "bg-surface-muted text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {archiveGroups.length ? (
              archiveGroups.map((group) => (
                <section key={group.key} className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                      {group.label}
                    </p>
                    <ChevronDown size={14} className="text-muted-foreground" />
                  </div>
                  <div className="space-y-4">
                    {group.items.map((p) => (
                      <MemberPostCard
                        key={p.id}
                        authorName={p.author.name}
                        authorAvatar={p.author.avatarUrl}
                        type={p.type}
                        text={p.text}
                        imgSrc={p.imageUrl}
                        compact
                        className="opacity-90"
                        prayLabel={String(p.counts.likes)}
                        prayed={p.isLiked}
                        commentsCount={p.counts.comments}
                        bookmarked={p.isBookmarked}
                        bookmarkLabel={String(p.counts.bookmarks)}
                        onPray={() => toggleLike(p.id)}
                        onBookmark={() => toggleBookmark(p.id)}
                        onOpenComments={() => {}}
                        onShare={() => {}}
                      />
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <Card className="rounded-[32px] bg-surface/80 border border-dashed border-border/70 py-20 text-center flex flex-col items-center gap-6">
                <div className="w-20 h-20 rounded-3xl bg-surface-muted border border-border/70 flex items-center justify-center text-muted-foreground shadow-inner">
                  <Inbox size={36} />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-xl font-black">Arsip Kosong</CardTitle>
                  <CardDescription className="text-xs uppercase tracking-widest font-bold opacity-50">Mulai berbagi untuk membangun arsip Anda.</CardDescription>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="bookmarks">
            <Card className="rounded-[32px] bg-surface/80 border border-dashed border-border/70 py-20 text-center flex flex-col items-center gap-6">
                <div className="w-20 h-20 rounded-3xl bg-surface-muted border border-border/70 flex items-center justify-center text-muted-foreground shadow-inner">
                  <Inbox size={36} />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-xl font-black text-muted-foreground">Belum ada post tersimpan.</CardTitle>
                </div>
              </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
