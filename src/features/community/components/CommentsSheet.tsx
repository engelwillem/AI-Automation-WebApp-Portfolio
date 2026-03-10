
"use client";

import { useState } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CommunityComment, CommunityUser } from "../types";
import { Send } from "lucide-react";

interface CommentsSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  comments: CommunityComment[];
  onAddComment: (text: string) => void;
  currentUser?: CommunityUser;
}

export function CommentsSheet({ isOpen, onOpenChange, comments, onAddComment, currentUser }: CommentsSheetProps) {
  const [newComment, setNewComment] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    onAddComment(newComment);
    setNewComment("");
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl p-0 sm:max-w-md mx-auto outline-none border-none">
        <div className="w-12 h-1.5 bg-muted rounded-full mx-auto my-3" />
        <SheetHeader className="px-6 py-2">
          <SheetTitle className="text-lg font-bold">Komentar ({comments.length})</SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col h-[calc(80vh-80px)]">
          <ScrollArea className="flex-1 p-6 pt-2">
            <div className="space-y-6">
              {comments.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <p className="text-muted-foreground text-sm">Belum ada komentar.</p>
                  <p className="text-xs text-muted-foreground/60">Jadilah yang pertama untuk berdiskusi!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 group">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarImage src={comment.author.avatarUrl} />
                      <AvatarFallback>{comment.author.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <div className="bg-muted/50 rounded-2xl px-4 py-2 ring-1 ring-border/30 group-hover:ring-primary/10 transition-all">
                        <p className="text-xs font-bold text-primary">{comment.author.name}</p>
                        <p className="text-sm text-foreground/90">{comment.text}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground pl-1">{comment.createdAt}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-border/50 bg-background pb-8">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input 
                placeholder="Tulis komentar..." 
                className="rounded-full bg-muted/30 border-none h-11"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <Button type="submit" size="icon" className="rounded-full shrink-0" disabled={!newComment.trim()}>
                <Send size={18} />
              </Button>
            </form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
