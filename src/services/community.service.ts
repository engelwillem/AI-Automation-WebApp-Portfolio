/**
 * @fileOverview Community Service Layer
 *
 * Laravel API is the primary source of truth.
 * Ensures 100% parity with legacy data structures.
 */

import { CommunityPost, CommunityComment, BookmarkCategory } from "@/features/community/types";
import { clearAppAccessToken, shouldInvalidateLocalSession } from "@/services/app-auth-token";
import { buildAppAuthHeaders } from "@/lib/app-auth-fetch";

class ApiError extends Error {
  constructor(
    public readonly message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiEnvelope<T> {
  data?: T;
}

const shouldWarnRepostDebug = process.env.NODE_ENV !== "production";

function warnRepostDebug(stage: string, details: Record<string, unknown>) {
  if (!shouldWarnRepostDebug) return;
  console.warn("[community.repost.debug]", stage, details);
}

function appendNestedFormData(formData: FormData, keyPrefix: string, value: unknown) {
  if (value === null || value === undefined) return;

  if (Array.isArray(value)) {
    value.forEach((item, index) => appendNestedFormData(formData, `${keyPrefix}[${index}]`, item));
    return;
  }

  if (typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      appendNestedFormData(formData, `${keyPrefix}[${key}]`, item);
    });
    return;
  }

  formData.append(keyPrefix, String(value));
}

interface ApiPost {
  id: string;
  type: string;
  type_label?: string;
  text: string;
  title?: string | null;
  imageUrl?: string | null;
  image_path?: string | null;
  thumb_path?: string | null;
  mediaPaths?: string[] | null;
  media_paths?: string[] | null;
  is_featured?: boolean;
  can_moderate?: boolean;
  metadata?: {
    media_aspect_ratio?: "9:16" | "4:5" | "1:1" | "16:9" | "og" | "auto";
    text_position?: "above" | "below";
    imageUrl?: string;
    preview_media_index?: number;
    ritual_user_reflection?: string;
    ritual_generated_meditation?: string;
    ritual_verse_text?: string;
    ritual_verse_reference?: string;
    related_verses?: Array<{ reference?: string; text?: string }>;
    interpretation_summary?: string;
    bookmark_origin?: string;
    visibility?: "private_renungan_archive" | "public";
    ref?: string;
    reference?: string;
    quote?: string;
  } | null;
  bookmark_category?: {
    id?: string | number;
    name?: string;
    slug?: string;
    is_default?: boolean;
  } | null;
  createdAt?: string;
  created_at: string;
  expiresAt?: string | null;
  expires_at?: string | null;
  author: {
    id: string | number;
    name: string | null;
    avatarUrl?: string | null;
    avatar_url?: string | null;
    isOfficial?: boolean;
    is_official?: boolean;
    is_admin?: boolean;
  };
  counts: {
    likes: number;
    comments: number;
    bookmarks: number;
  };
  isLiked: boolean;
  isBookmarked: boolean;
}

const API_BASE_FALLBACK = "https://api.thechoosentalks.org";

const resolveApiOrigin = (): string => {
  const raw =
    process.env.NEXT_PUBLIC_LARAVEL_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    API_BASE_FALLBACK;
  try {
    return new URL(raw).origin;
  } catch {
    return API_BASE_FALLBACK;
  }
};

const extractKnownAssetPath = (pathname: string): string | null => {
  if (!pathname) return null;
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (normalizedPath.startsWith("/api/v1/community/media/")) {
    return normalizedPath;
  }

  if (normalizedPath.startsWith("/storage/community/posts/")) {
    return normalizedPath.replace("/storage/community/posts/", "/api/v1/community/media/community/posts/");
  }

  if (normalizedPath.startsWith("/storage/") || normalizedPath.startsWith("/api/v1/avatar/")) {
    return normalizedPath;
  }

  const communityMediaMarker = normalizedPath.indexOf("/api/v1/community/media/");
  if (communityMediaMarker >= 0) {
    return normalizedPath.slice(communityMediaMarker);
  }

  const communityStorageMarker = normalizedPath.indexOf("/storage/community/posts/");
  if (communityStorageMarker >= 0) {
    return normalizedPath.slice(communityStorageMarker).replace("/storage/community/posts/", "/api/v1/community/media/community/posts/");
  }

  const storageMarker = normalizedPath.indexOf("/storage/");
  if (storageMarker >= 0) {
    return normalizedPath.slice(storageMarker);
  }

  const avatarMarker = normalizedPath.indexOf("/api/v1/avatar/");
  if (avatarMarker >= 0) {
    return normalizedPath.slice(avatarMarker);
  }

  return null;
};

const normalizeCommunityAssetUrl = (value?: string | null): string | undefined => {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  if (raw.startsWith("blob:") || raw.startsWith("data:image/")) return raw;

  const apiOrigin = resolveApiOrigin();

  try {
    const parsed = new URL(raw);
    const knownPath = extractKnownAssetPath(parsed.pathname);
    if (knownPath) {
      const normalizedPath = `${knownPath}${parsed.search}${parsed.hash}`;
      return `${apiOrigin}${normalizedPath}`;
    }
    return parsed.toString();
  } catch {
    // Handle relative paths below
  }

  const normalized = raw.startsWith("/") ? raw : `/${raw.replace(/^\/+/, "")}`;
  const knownPath = extractKnownAssetPath(normalized);
  if (knownPath) {
    return `${apiOrigin}${knownPath}`;
  }

  return normalized;
};

const mapApiPost = (post: ApiPost): CommunityPost => ({
  id: String(post.id),
  type: post.type,
  type_label: post.type_label || post.type,
  text: post.text || "",
  title: post.title ?? undefined,
  imageUrl: normalizeCommunityAssetUrl(post.imageUrl || post.image_path),
  thumbPath: post.thumb_path ?? undefined,
  mediaPaths: (post.mediaPaths || post.media_paths || [])
    .map((item) => normalizeCommunityAssetUrl(item))
    .filter((item): item is string => Boolean(item)),
  isFeatured: Boolean(post.is_featured),
  can_moderate: Boolean(post.can_moderate),
  bookmark_category: post.bookmark_category
    ? {
        id: String(post.bookmark_category.id || ""),
        name: String(post.bookmark_category.name || "Arsip"),
        slug: String(post.bookmark_category.slug || "arsip"),
        is_default: Boolean(post.bookmark_category.is_default),
      }
    : null,
  metadata: post.metadata ?? undefined,
  createdAt: post.created_at || post.createdAt || "",
  expiresAt: post.expires_at ?? post.expiresAt ?? undefined,
  author: {
    id: String(post.author?.id || ""),
    name: post.author?.name || "Member",
    avatarUrl: normalizeCommunityAssetUrl(post.author?.avatarUrl || post.author?.avatar_url),
    isOfficial: Boolean(post.author?.isOfficial || post.author?.is_official || post.author?.is_admin),
  },
  counts: {
    likes: Number(post.counts?.likes || 0),
    comments: Number(post.counts?.comments || 0),
    bookmarks: Number(post.counts?.bookmarks || 0),
  },
  isLiked: Boolean(post.isLiked),
  isBookmarked: Boolean(post.isBookmarked),
});

const buildHeaders = (needsAuth = false): HeadersInit => {
  if (!needsAuth) {
    return {
      Accept: "application/json",
    };
  }

  return buildAppAuthHeaders({
    includeBearerFallback: true,
  });
};

function handleAuthFailure(status: number) {
  // Only treat 401 as a confirmed invalid session.
  // 403 can be a transient permission/config issue and should not hard-logout the user.
  if (shouldInvalidateLocalSession(status)) {
    clearAppAccessToken();
  }
}

async function assertOk(response: Response, message: string): Promise<void> {
  if (response.ok) return;
  handleAuthFailure(response.status);

  let detail = "";
  try {
    const body = await response.clone().json() as {
      message?: string;
      errors?: Record<string, string[] | string>;
    };
    const topMessage = String(body?.message || "").trim();
    if (topMessage) {
      detail = topMessage;
    } else if (body?.errors && typeof body.errors === "object") {
      const firstError = Object.values(body.errors).flat().find(Boolean);
      if (firstError) detail = String(firstError).trim();
    }
  } catch {
    // Ignore non-JSON error bodies.
  }

  const suffix = detail ? ` - ${detail}` : "";
  throw new ApiError(`${message}: ${response.status}${suffix}`, response.status);
}

async function fetchWithRetry(input: RequestInfo | URL, init: RequestInit, attempts = 2): Promise<Response> {
  let response = await fetch(input, init);

  for (let attempt = 1; attempt < attempts && response.status >= 500; attempt += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 250 * attempt));
    response = await fetch(input, init);
  }

  return response;
}

export const CommunityService = {
  async listPosts(): Promise<{ posts: CommunityPost[]; archivePosts: CommunityPost[] }> {
    const response = await fetchWithRetry("/api/community/posts", {
      method: "GET",
      cache: "no-store",
      headers: buildHeaders(true),
    });

    await assertOk(response, "Failed to fetch posts");
    const payload = await response.json() as ApiEnvelope<{ posts: ApiPost[], archivePosts?: ApiPost[] }>;
    return {
      posts: (payload?.data?.posts ?? []).map(mapApiPost),
      archivePosts: (payload?.data?.archivePosts ?? []).map(mapApiPost),
    };
  },

  async createPost(
    text: string,
    type: string = 'user_post',
    images: File[] = [],
    metadata?: Record<string, unknown>
  ): Promise<CommunityPost> {
    const formData = new FormData();
    formData.append('text', text);
    formData.append('type', type);
    if (metadata && typeof metadata === "object") {
      Object.entries(metadata).forEach(([key, value]) => {
        appendNestedFormData(formData, `metadata[${key}]`, value);
      });
    }
    images.forEach((file) => {
      formData.append('images[]', file);
    });

    const response = await fetch("/api/community/posts", {
      method: "POST",
      headers: buildHeaders(true),
      body: formData,
    });

    await assertOk(response, "Failed to create post");
    const payload = await response.json() as ApiEnvelope<{ post: ApiPost }>;
    if (!payload?.data?.post) throw new ApiError("Malformed response", 502);
    
    return mapApiPost(payload.data.post);
  },

  async deletePost(postId: string): Promise<void> {
    const response = await fetch(`/api/community/posts?postId=${encodeURIComponent(postId)}`, {
      method: "DELETE",
      headers: buildHeaders(true),
    });

    await assertOk(response, "Failed to delete post");
  },

  async updatePostText(postId: string, text: string): Promise<CommunityPost> {
    const response = await fetch(`/api/community/posts?postId=${encodeURIComponent(postId)}`, {
      method: "PATCH",
      headers: {
        ...buildHeaders(true),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    await assertOk(response, "Failed to update post");
    const payload = await response.json() as ApiEnvelope<{ post: ApiPost }>;
    if (!payload?.data?.post) throw new ApiError("Malformed response", 502);

    return mapApiPost(payload.data.post);
  },

  async updatePostPreview(postId: string, previewMediaIndex: number): Promise<CommunityPost> {
    const response = await fetch(`/api/community/posts?postId=${encodeURIComponent(postId)}`, {
      method: "PATCH",
      headers: {
        ...buildHeaders(true),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        metadata: { preview_media_index: previewMediaIndex },
      }),
    });

    await assertOk(response, "Failed to update preview image");
    const payload = await response.json() as ApiEnvelope<{ post: ApiPost }>;
    if (!payload?.data?.post) throw new ApiError("Malformed response", 502);

    return mapApiPost(payload.data.post);
  },

  async repost(postId: string): Promise<CommunityPost | null> {
    const response = await fetch(`/api/community/posts/${postId}/repost`, {
      method: "POST",
      headers: buildHeaders(true),
    });

    if (!response.ok) {
      const debugResponse = response.clone();
      let debugBodyShape: Record<string, unknown> = {};
      let debugBodyType = "empty";

      try {
        const parsed = (await debugResponse.json()) as unknown;
        if (parsed && typeof parsed === "object") {
          debugBodyType = "json";
          const root = parsed as Record<string, unknown>;
          const data = root.data;
          debugBodyShape = {
            rootKeys: Object.keys(root).slice(0, 12),
            hasDataObject: Boolean(data && typeof data === "object"),
            dataKeys:
              data && typeof data === "object"
                ? Object.keys(data as Record<string, unknown>).slice(0, 12)
                : [],
          };
        }
      } catch {
        try {
          const raw = (await debugResponse.text()).trim();
          debugBodyType = raw ? "text" : "empty";
          debugBodyShape = {
            textPreview: raw ? raw.slice(0, 220) : "",
          };
        } catch {
          debugBodyType = "unreadable";
        }
      }

      warnRepostDebug("http_error", {
        postId,
        status: response.status,
        bodyType: debugBodyType,
        ...debugBodyShape,
      });
    }

    await assertOk(response, "Failed to repost post");
    const payload = (await response.json().catch(() => ({}))) as
      | ApiEnvelope<{ post?: ApiPost } & Record<string, unknown>>
      | { data?: Record<string, unknown>; post?: ApiPost };

    const rootPost =
      "post" in payload && payload.post && typeof payload.post === "object" ? payload.post : null;

    const candidate =
      payload?.data && typeof payload.data === "object" && payload.data !== null
        ? (payload.data as Record<string, unknown>).post ?? payload.data
        : rootPost;

    if (candidate && typeof candidate === "object" && "id" in (candidate as Record<string, unknown>)) {
      return mapApiPost(candidate as ApiPost);
    }

    const payloadData = "data" in payload ? payload.data : undefined;
    warnRepostDebug("inconsistent_success_payload", {
      postId,
      status: response.status,
      hasDataObject: Boolean(payloadData && typeof payloadData === "object"),
      dataKeys:
        payloadData && typeof payloadData === "object"
          ? Object.keys(payloadData as Record<string, unknown>).slice(0, 12)
          : [],
      hasRootPost: Boolean("post" in payload && payload.post),
    });

    // Some backends may acknowledge repost without returning full post payload.
    return null;
  },

  async listBookmarks(): Promise<CommunityPost[]> {
    const response = await fetch("/api/community/bookmarks", {
      method: "GET",
      cache: "no-store",
      headers: buildHeaders(true),
    });

    await assertOk(response, "Failed to fetch bookmarks");
    const payload = await response.json() as ApiEnvelope<{ bookmarks: ApiPost[] }>;
    return (payload?.data?.bookmarks ?? []).map(mapApiPost);
  },

  async listBookmarkCategories(): Promise<{ defaultCategoryId?: string; categories: BookmarkCategory[] }> {
    const response = await fetch("/api/community/bookmark-categories", {
      method: "GET",
      cache: "no-store",
      headers: buildHeaders(true),
    });

    await assertOk(response, "Failed to fetch bookmark categories");
    const payload = await response.json() as ApiEnvelope<{
      defaultCategoryId?: string | number;
      categories?: Array<{
        id: string | number;
        name?: string;
        slug?: string;
        is_default?: boolean;
        count?: number;
      }>;
    }>;

    return {
      defaultCategoryId: payload?.data?.defaultCategoryId ? String(payload.data.defaultCategoryId) : undefined,
      categories: (payload?.data?.categories ?? []).map((item) => ({
        id: String(item.id),
        name: String(item.name || "Kategori"),
        slug: String(item.slug || ""),
        is_default: Boolean(item.is_default),
        count: Number(item.count || 0),
      })),
    };
  },

  async createBookmarkCategory(name: string): Promise<BookmarkCategory> {
    const response = await fetch("/api/community/bookmark-categories", {
      method: "POST",
      headers: {
        ...buildHeaders(true),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    await assertOk(response, "Failed to create bookmark category");
    const payload = await response.json() as ApiEnvelope<{
      category?: {
        id: string | number;
        name?: string;
        slug?: string;
        is_default?: boolean;
        count?: number;
      };
    }>;
    if (!payload?.data?.category) throw new ApiError("Malformed response", 502);

    const item = payload.data.category;
    return {
      id: String(item.id),
      name: String(item.name || "Kategori"),
      slug: String(item.slug || ""),
      is_default: Boolean(item.is_default),
      count: Number(item.count || 0),
    };
  },

  async moveBookmarkToCategory(postId: string, categoryId: string): Promise<void> {
    const response = await fetch(`/api/community/bookmarks/${encodeURIComponent(postId)}/category`, {
      method: "PATCH",
      headers: {
        ...buildHeaders(true),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ category_id: Number(categoryId) }),
    });

    await assertOk(response, "Failed to move bookmark category");
  },

  async toggleLike(postId: string): Promise<CommunityPost> {
    const response = await fetch(`/api/community/posts/${postId}/pray`, {
      method: "POST",
      headers: buildHeaders(true),
    });

    await assertOk(response, "Failed to toggle pray reaction");
    const payload = await response.json() as ApiEnvelope<{ post: ApiPost }>;
    if (!payload?.data?.post) throw new ApiError("Malformed response", 502);
    
    return mapApiPost(payload.data.post);
  },

  async toggleBookmark(postId: string): Promise<CommunityPost> {
    const response = await fetch(`/api/community/posts/${postId}/bookmark`, {
      method: "POST",
      headers: buildHeaders(true),
    });

    await assertOk(response, "Failed to toggle bookmark");
    const payload = await response.json() as ApiEnvelope<{ post: ApiPost }>;
    if (!payload?.data?.post) throw new ApiError("Malformed response", 502);
    
    return mapApiPost(payload.data.post);
  },

  async getComments(postId: string): Promise<CommunityComment[]> {
    const response = await fetch(`/api/community/posts/${postId}/comments`, {
      method: "GET",
      cache: "no-store",
      headers: buildHeaders(true),
    });

    await assertOk(response, "Failed to fetch comments");
    const payload = await response.json() as ApiEnvelope<{ comments: any[] }>;
    return (payload?.data?.comments ?? []).map((c) => ({
      id: String(c.id),
      postId: String(c.postId),
      text: c.text,
      createdAt: c.createdAt,
      replyToId: c.replyToId,
      replyToAuthor: c.replyToAuthor,
      author: {
        id: String(c.author?.id ?? ""),
        name: String(c.author?.name ?? "Member"),
        avatarUrl: normalizeCommunityAssetUrl(c.author?.avatarUrl),
        isOfficial: Boolean(c.author?.isOfficial),
      },
    }));
  },

  async createComment(postId: string, text: string, replyToCommentId?: string): Promise<CommunityComment> {
    const response = await fetch(`/api/community/posts/${postId}/comments`, {
      method: "POST",
      headers: {
        ...buildHeaders(true),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        text,
        reply_to_comment_id: replyToCommentId ? Number(replyToCommentId) : null,
      }),
    });

    if (!response.ok && response.status === 422) {
      const errorJson = await response.json().catch(() => ({}));
      const message = errorJson?.message || 'Validation Error';
      throw new ApiError(message, 422);
    }

    await assertOk(response, "Failed to create comment");
    const payload = await response.json() as ApiEnvelope<{ comment: any }>;
    if (!payload?.data?.comment) throw new ApiError("Malformed response", 502);

    const c = payload.data.comment;
    return {
      id: String(c.id),
      postId: String(c.postId),
      text: c.text,
      createdAt: c.createdAt,
      replyToId: c.replyToId,
      replyToAuthor: c.replyToAuthor,
      author: {
        id: String(c.author?.id ?? ""),
        name: String(c.author?.name ?? "Member"),
        avatarUrl: normalizeCommunityAssetUrl(c.author?.avatarUrl),
        isOfficial: Boolean(c.author?.isOfficial),
      },
    };
  }
};
