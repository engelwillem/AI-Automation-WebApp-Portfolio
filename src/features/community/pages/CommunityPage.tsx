"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostComposer } from "../components/PostComposer";
import { PostCard } from "../components/PostCard";
import { CommunityPost, CommunityComment, CommunityUser } from "../types";
import { Inbox, Loader2 } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { CommunityService } from "@/services/community.service";
import { MOCK_USERS } from "../mock";

export function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [activeTab, setActiveTab] = useState("today");
  const [isLoading, setIsLoading] = useState(true);
  const currentUser: CommunityUser = MOCK_USERS.me;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const fetchedPosts = await CommunityService.listPosts();
        const allCommentsPromises = fetchedPosts.map(p => CommunityService.listComments(p.id));
        const commentsArrays = await Promise.all(allCommentsPromises);
        
        setPosts(fetchedPosts);
        setComments(commentsArrays.flat());
      } catch (error) {
        console.error("Failed to fetch community data", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handlePost = async (text: string) => {
    try {
      const newPost = await CommunityService.createPost(text);
      setPosts((prev) => [newPost, ...prev.filter((post) => post.id !== newPost.id)]);
    } catch (error) {
      console.error("Failed to create post", error);
    }
  };

  const handleAddComment = async (postId: string, text: string) => {
    try {
      const newComment = await CommunityService.addComment(postId, text);
      setComments((prev) => [...prev, newComment]);
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, counts: { ...p.counts, comments: p.counts.comments + 1 } } : p)));
    } catch (error) {
      console.error("Failed to add comment", error);
    }
  };

  const toggleLike = async (postId: string) => {
    const originalPosts = [...posts];
    setPosts(posts.map(p => 
      p.id === postId 
        ? { ...p, isLiked: !p.isLiked, counts: { ...p.counts, likes: p.counts.likes + (p.isLiked ? -1 : 1) } } 
        : p
    ));

    try {
      await CommunityService.toggleLike(postId);
    } catch (error) {
      setPosts(originalPosts);
      console.error("Failed to toggle like", error);
    }
  };

  const toggleBookmark = async (postId: string) => {
    const originalPosts = [...posts];
    setPosts(posts.map(p => p.id === postId ? { ...p, isBookmarked: !p.isBookmarked } : p));

    try {
      await CommunityService.toggleBookmark(postId);
    } catch (error) {
      setPosts(originalPosts);
      console.error("Failed to toggle bookmark", error);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-700">
      <header className="p-8 pb-4 space-y-2">
        <h2 className="tct-h1 text-brand">Komunitas</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Tempat berbagi inspirasi, doa, dan pertumbuhan bersama.
        </p>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6">
        <TabsList className="w-full bg-muted/30 p-1 rounded-2xl mb-8">
          <TabsTrigger value="today" className="flex-1">Hari ini</TabsTrigger>
          <TabsTrigger value="archive" className="flex-1">Arsip</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="m-0 space-y-6 pb-10">
          <PostComposer onPost={handlePost} currentUser={currentUser} />
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="animate-spin mb-4 text-brand" size={32} />
              <p className="tct-label">Memperbarui Feed...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  comments={comments.filter(c => c.postId === post.id)}
                  onAddComment={handleAddComment}
                  onLike={toggleLike}
                  onBookmark={toggleBookmark}
                  currentUser={currentUser}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archive" className="m-0">
          <Card className="border-dashed border-2 bg-muted/10 py-20 text-center flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center text-muted-foreground shadow-inner">
              <Inbox size={36} />
            </div>
            <div className="space-y-2">
              <CardTitle className="tct-h2">Arsip Kosong</CardTitle>
              <CardDescription>Mulai berbagi untuk membangun arsip Anda.</CardDescription>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
