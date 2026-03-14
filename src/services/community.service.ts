/**
 * @fileOverview Community Service Layer
 *
 * Laravel API is the primary source of truth.
 * Mock in-memory state remains as a local fallback when API is unreachable.
 */

import { CommunityPost, CommunityComment } from "@/features/community/types";
import { MOCK_POSTS, MOCK_COMMENTS } from "@/features/community/mock";
import { clearAppAccessToken, getAppAccessToken } from "@/services/app-auth-token";

let posts: CommunityPost[] = [...MOCK_POSTS];
let comments: CommunityComment[] = [...MOCK_COMMENTS];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiEnvelope<T> {
  data?: T;
}

interface ApiPost {
  id: string;
  type?: string;
  text: string;
  imageUrl?: string;
  mediaPaths?: string[];
  isFeatured?: boolean;
  metadata?: any;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatarUrl?: string;
    isOfficial?: boolean;
  };
  counts: {
    likes: number;
    comments: number;
    bookmarks: number;
  };
  isLiked: boolean;
  isBookmarked: boolean;
}

interface ApiComment {
  id: string;
  postId: string;
  text: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

const mapApiPost = (post: ApiPost): CommunityPost => ({
  id: String(post.id),
  type: post.type || "member_post",
  text: post.text || "",
  imageUrl: post.imageUrl,
  mediaPaths: post.mediaPaths,
  isFeatured: Boolean(post.isFeatured),
  metadata: post.metadata,
  createdAt: post.createdAt || "Baru saja",
  author: {
    id: String(post.author?.id || ""),
    name: post.author?.name || "Member",
    avatarUrl: post.author?.avatarUrl,
    isOfficial: Boolean(post.author?.isOfficial),
  },
  counts: {
    likes: Number(post.counts?.likes || 0),
    comments: Number(post.counts?.comments || 0),
    bookmarks: Number(post.counts?.bookmarks || 0),
  },
  isLiked: Boolean(post.isLiked),
  isBookmarked: Boolean(post.isBookmarked),
});

const mapApiComment = (comment: ApiComment): CommunityComment => ({
  id: String(comment.id),
  postId: String(comment.postId),
  text: comment.text || "",
  createdAt: comment.createdAt || "Baru saja",
  author: {
    id: String(comment.author?.id || ""),
    name: comment.author?.name || "Member",
    avatarUrl: comment.author?.avatarUrl,
  },
});

const buildHeaders = (needsAuth = false): HeadersInit => {
  let headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (needsAuth) {
    const token = getAppAccessToken();
    if (token) {
      headers = {
        ...headers,
        Authorization: `Bearer ${token}`,
      };
    }
  }

  return headers;
};

function handleAuthFailure(status: number) {
  if (status === 401 || status === 403) {
    clearAppAccessToken();
  }
}

async function parseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function assertOk(response: Response, message: string): Promise<void> {
  if (response.ok) return;

  handleAuthFailure(response.status);
  throw new ApiError(`${message}: ${response.status}`, response.status);
}

export const CommunityService = {
  async listPosts(): Promise<CommunityPost[]> {
    try {
      const response = await fetch("/api/community/posts", {
        method: "GET",
        cache: "no-store",
        headers: buildHeaders(true),
      });

      await assertOk(response, "Failed to fetch posts");

      const payload = await parseJson<ApiEnvelope<{ posts: ApiPost[] }>>(response);
      const nextPosts = (payload?.data?.posts ?? []).map(mapApiPost);

      if (nextPosts.length > 0) {
        posts = nextPosts;
      }

      return nextPosts.length > 0 ? nextPosts : [...posts];
    } catch {
      await delay(150);
      return [...posts];
    }
  },

  async createPost(text: string, imageUrl?: string): Promise<CommunityPost> {
    const response = await fetch("/api/community/posts", {
      method: "POST",
      headers: buildHeaders(true),
      body: JSON.stringify({ text, imageUrl }),
    });

    await assertOk(response, "Failed to create post");

    const payload = await parseJson<ApiEnvelope<{ post: ApiPost }>>(response);
    if (!payload?.data?.post) {
      throw new ApiError("Malformed create post payload", 502);
    }

    const created = mapApiPost(payload.data.post);
    posts = [created, ...posts.filter((item) => item.id !== created.id)];
    return created;
  },

  async toggleLike(postId: string): Promise<CommunityPost> {
    const response = await fetch(`/api/community/posts/${postId}/pray`, {
      method: "POST",
      headers: buildHeaders(true),
    });

    await assertOk(response, "Failed to toggle pray reaction");

    const payload = await parseJson<ApiEnvelope<{ post: ApiPost }>>(response);
    if (!payload?.data?.post) {
      throw new ApiError("Malformed pray payload", 502);
    }

    const updated = mapApiPost(payload.data.post);
    posts = posts.map((item) => (item.id === postId ? updated : item));
    return updated;
  },

  async toggleBookmark(postId: string): Promise<CommunityPost> {
    const response = await fetch(`/api/community/posts/${postId}/bookmark`, {
      method: "POST",
      headers: buildHeaders(true),
    });

    await assertOk(response, "Failed to toggle bookmark");

    const payload = await parseJson<ApiEnvelope<{ post: ApiPost }>>(response);
    if (!payload?.data?.post) {
      throw new ApiError("Malformed bookmark payload", 502);
    }

    const updated = mapApiPost(payload.data.post);
    posts = posts.map((item) => (item.id === postId ? updated : item));
    return updated;
  },

  async listComments(postId: string): Promise<CommunityComment[]> {
    try {
      const response = await fetch(`/api/community/posts/${postId}/comments`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) throw new Error(`Failed to fetch comments: ${response.status}`);

      const payload = await parseJson<ApiEnvelope<{ comments: ApiComment[] }>>(response);
      const nextComments = (payload?.data?.comments ?? []).map(mapApiComment);

      comments = [
        ...comments.filter((item) => item.postId !== postId),
        ...nextComments,
      ];

      return nextComments;
    } catch {
      await delay(100);
      return comments.filter((item) => item.postId === postId);
    }
  },

  async addComment(postId: string, text: string): Promise<CommunityComment> {
    const response = await fetch(`/api/community/posts/${postId}/comments`, {
      method: "POST",
      headers: buildHeaders(true),
      body: JSON.stringify({ text }),
    });

    await assertOk(response, "Failed to add comment");

    const payload = await parseJson<ApiEnvelope<{ comment: ApiComment }>>(response);
    if (!payload?.data?.comment) {
      throw new ApiError("Malformed comment payload", 502);
    }

    const created = mapApiComment(payload.data.comment);
    comments = [...comments, created];
    posts = posts.map((item) =>
      item.id === postId
        ? {
            ...item,
            counts: {
              ...item.counts,
              comments: item.counts.comments + 1,
            },
          }
        : item,
    );

    return created;
  },
};
