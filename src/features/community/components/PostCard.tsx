
"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Bookmark, Share2, MoreHorizontal } from "lucide-react";
import { CommunityPost, CommunityComment, CommunityUser } from "../types";
import { cn } from "@/lib/utils";
import { CommentsSheet } from "./CommentsSheet";

interface PostCardProps {
  post: CommunityPost;
  comments: CommunityComment[];
  onAddComment: (postId: string, text: string) => void;
  onLike: (postId: string) => void;
  onBookmark: (postId: string) => void;
  currentUser?: CommunityUser;
}

export function PostCard({ post, comments, onAddComment, onLike, onBookmark, currentUser }: PostCardProps) {
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const commentsCount = Math.max(post.counts.comments, comments.length);

  return (
    <>
      <Card className="mb-4 overflow-hidden border border-border/70 bg-surface/80 shadow-card ring-1 ring-border/40 backdrop-blur-md transition-all duration-300 hover:bg-surface-elevated hover:ring-border/70">
        <CardHeader className="p-4 flex-row items-center gap-3 space-y-0">
          <Avatar className="w-10 h-10 border-2 border-border/60 shadow-sm ring-2 ring-background">
            <AvatarImage src={post.author.avatarUrl} />
            <AvatarFallback>{post.author.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate text-foreground"> {post.author.name}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.15em]">{post.createdAt}</p>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
            <MoreHorizontal size={18} className="text-muted-foreground" />
          </Button>
        </CardHeader>

        <CardContent className="p-4 pt-0 space-y-4">
          {post.text && (
            <p className="text-sm text-foreground/90 leading-relaxed">
              {post.text}
            </p>
          )}
          {post.imageUrl && (
            <div className="rounded-2xl overflow-hidden shadow-inner bg-muted/20">
              <img 
                src={post.imageUrl} 
                alt="Post content" 
                className="object-cover w-full h-full max-h-[400px]"
              />
            </div>
          )}
        </CardContent>

        <CardFooter className="p-2 px-4 flex justify-between border-t border-border/70 bg-surface-muted/40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => onLike(post.id)}
              className={cn(
                "flex items-center gap-1.5 transition-all active:scale-125",
                post.isLiked ? "text-brand" : "text-muted-foreground"
              )}
            >
              <Heart size={20} className={cn(post.isLiked && "fill-current animate-in zoom-in-50")} />
              <span className="text-[11px] font-bold">{post.counts.likes}</span>
            </button>
            <button 
              onClick={() => setIsCommentsOpen(true)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <MessageCircle size={20} />
              <span className="text-[11px] font-bold">{commentsCount}</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onBookmark(post.id)}
              className={cn(
                "p-2 rounded-full transition-all active:scale-110",
                post.isBookmarked ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Bookmark size={20} className={cn(post.isBookmarked && "fill-current")} />
            </button>
            <button className="p-2 text-muted-foreground">
              <Share2 size={20} />
            </button>
          </div>
        </CardFooter>
      </Card>

      <CommentsSheet 
        isOpen={isCommentsOpen} 
        onOpenChange={setIsCommentsOpen}
        comments={comments}
        onAddComment={(text) => onAddComment(post.id, text)}
        currentUser={currentUser}
      />
    </>
  );
}
