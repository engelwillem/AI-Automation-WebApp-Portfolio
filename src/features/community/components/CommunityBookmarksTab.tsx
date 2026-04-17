"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { MemberPostCard } from "./MemberPostCard";
import type { BookmarkCategory, CommunityPost } from "../types";

type CommunityBookmarksTabProps = {
  className?: string;
  bookmarkLoadError: string | null;
  bookmarkPosts: CommunityPost[];
  bookmarkCategories: BookmarkCategory[];
  activeBookmarkCategoryId: string;
  filteredBookmarkPosts: CommunityPost[];
  isAuthenticated: boolean;
  currentUserId: string;
  followBusyAuthorId: string | null;
  onSetActiveCategoryId: (categoryId: string) => void;
  onCreateCategory: () => Promise<void> | void;
  onPray: (postId: string) => void;
  onBookmark: (postId: string) => void;
  onOpenComments: (postId: string) => void;
  onShare: (postId: string, text?: string | null) => void | Promise<void>;
  onToggleFollowAuthor: (authorId: string) => void;
  onMessageAuthor: (authorId: string) => void;
  canDeletePost: (post: CommunityPost) => boolean;
  canEditPost: (post: CommunityPost) => boolean;
  onEditText: (postId: string, currentText?: string | null) => void | Promise<void>;
  onEditPreview: (post: CommunityPost) => void | Promise<void>;
  onEditBookmarkCategory: (post: CommunityPost) => void | Promise<void>;
  onDelete: (postId: string) => void | Promise<void>;
  resolveAuthorAvatar: (post: CommunityPost) => string | null;
  shareBusyPostId?: string | null;
};

export function CommunityBookmarksTab({
  className,
  bookmarkLoadError,
  bookmarkPosts,
  bookmarkCategories,
  activeBookmarkCategoryId,
  filteredBookmarkPosts,
  isAuthenticated,
  currentUserId,
  followBusyAuthorId,
  onSetActiveCategoryId,
  onCreateCategory,
  onPray,
  onBookmark,
  onOpenComments,
  onShare,
  onToggleFollowAuthor,
  onMessageAuthor,
  canDeletePost,
  canEditPost,
  onEditText,
  onEditPreview,
  onEditBookmarkCategory,
  onDelete,
  resolveAuthorAvatar,
  shareBusyPostId,
}: CommunityBookmarksTabProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {bookmarkLoadError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-[13px] text-amber-800">
          {bookmarkLoadError}
        </div>
      ) : null}
      <div className="rounded-3xl border border-slate-200/70 bg-white/85 p-4 shadow-[0_20px_45px_-34px_rgba(15,23,42,0.35)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] font-black uppercase tracking-[0.18em] text-slate-500">Kategori Bookmark</p>
          <button
            type="button"
            onClick={() => void onCreateCategory()}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
          >
            <Plus className="h-3.5 w-3.5" />
            Kategori Baru
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onSetActiveCategoryId("all")}
            className={cn(
              "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all",
              activeBookmarkCategoryId === "all"
                ? "bg-[#00A9D6] text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:text-slate-900",
            )}
          >
            Semua ({bookmarkPosts.length})
          </button>
          {bookmarkCategories.map((category) => {
            const count = bookmarkPosts.filter(
              (post) => String(post.bookmark_category?.id || "") === String(category.id),
            ).length;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onSetActiveCategoryId(String(category.id))}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all",
                  String(activeBookmarkCategoryId) === String(category.id)
                    ? "bg-[#00A9D6] text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:text-slate-900",
                )}
              >
                {category.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {filteredBookmarkPosts.length > 0 ? (
        filteredBookmarkPosts.map((post) => (
          <MemberPostCard
            key={post.id}
            authorId={post.author.id}
            authorName={post.author.name}
            authorAvatar={resolveAuthorAvatar(post)}
            isAuthenticated={isAuthenticated}
            isFollowingAuthor={Boolean(post.author.isFollowing)}
            isMutualFollow={Boolean(post.author.isMutualFollow)}
            canFollowAuthor={Boolean(currentUserId) && currentUserId !== post.author.id}
            type={post.type}
            text={post.text}
            metadata={post.metadata}
            imgSrc={post.imageUrl}
            mediaSrcList={post.mediaPaths || undefined}
            aspectRatio={post.metadata?.media_aspect_ratio}
            createdAt={post.createdAt}
            prayLabel={String(post.counts.likes || 0)}
            prayed={post.isLiked}
            commentsCount={post.counts.comments || 0}
            bookmarked={post.isBookmarked}
            bookmarkLabel={String(post.counts.bookmarks || 0)}
            onPray={() => onPray(post.id)}
            onBookmark={() => onBookmark(post.id)}
            onOpenComments={() => onOpenComments(post.id)}
            onShare={() => onShare(post.id, post.text)}
            onToggleFollowAuthor={() => onToggleFollowAuthor(post.author.id)}
            onMessageAuthor={() => onMessageAuthor(post.author.id)}
            followBusy={followBusyAuthorId === post.author.id}
            canDelete={canDeletePost(post)}
            canEdit={canEditPost(post)}
            canEditPreview={canEditPost(post) && Boolean(post.mediaPaths?.length)}
            canEditBookmarkCategory={post.isBookmarked}
            onEditText={() => onEditText(post.id, post.text)}
            onEditPreview={() => onEditPreview(post)}
            onEditBookmarkCategory={() => onEditBookmarkCategory(post)}
            onDelete={() => onDelete(post.id)}
            shareBusy={shareBusyPostId === post.id}
          />
        ))
      ) : (
        <div className="max-w-[420px] px-4 pb-24 pt-12">
          <p className="text-[15px] leading-relaxed text-foreground/70">
            Belum ada memori rohani di kategori ini. Simpan renunganmu agar bisa dibaca lagi saat kamu butuh
            dikuatkan.
          </p>
        </div>
      )}
    </div>
  );
}
