import axiosInstance from './axiosInstance'
import { unwrap, unwrapList, unwrapPage } from './unwrap'
import type { ApiResponse, PaginatedResponse } from '@types/common'
import type { Post, PostComment, PostLiker, PostVisibility } from '@types/post'

/** Backend Post (snake-cased authors). */
interface BackendPost {
  id: string
  authorId: string
  author?: {
    id: string
    name: string
    avatar?: string
    verified?: boolean
  }
  title: string
  excerpt: string
  body?: string
  location: string
  image: string
  galleryUrls?: string[]
  tags?: string[]
  likeCount: number
  commentCount: number
  shareCount?: number
  visibility?: PostVisibility
  createdAt: string
  updatedAt: string
  isLiked?: boolean
  isFollowingAuthor?: boolean
  isOwner?: boolean
}

interface BackendComment {
  id: string
  authorId: string
  author?: { id: string; name: string; avatar?: string }
  content: string
  parentId?: string | null
  likeCount: number
  isLiked?: boolean
  createdAt: string
}

/** Map BE → FE shape (FE flattens author fields). */
export const adaptPost = (b: BackendPost): Post => ({
  id: b.id,
  authorId: b.authorId,
  authorName: b.author?.name ?? 'Người dùng',
  authorAvatar: b.author?.avatar ?? '',
  authorVerified: b.author?.verified,
  location: b.location,
  postedAt: new Date(b.createdAt).toLocaleDateString('vi-VN'),
  title: b.title,
  excerpt: b.excerpt,
  body: b.body,
  image: b.image,
  gallery: b.galleryUrls,
  tags: b.tags,
  likes: b.likeCount,
  comments: b.commentCount,
  shares: b.shareCount,
  visibility: b.visibility ?? 'public',
  isLiked: b.isLiked,
})

const adaptComment = (b: BackendComment): PostComment => ({
  id: b.id,
  authorId: b.authorId,
  authorName: b.author?.name ?? 'Người dùng',
  authorAvatar: b.author?.avatar ?? '',
  content: b.content,
  parentId: b.parentId ?? null,
  createdAt: new Date(b.createdAt).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }),
  likes: b.likeCount,
  isLiked: b.isLiked,
})

export const postService = {
  list: async (params?: { feed?: string; tag?: string; authorId?: string }): Promise<Post[]> => {
    const res = await axiosInstance.get<ApiResponse<PaginatedResponse<BackendPost>>>(
      '/posts',
      { params },
    )
    return unwrapList(res).map(adaptPost)
  },

  getById: async (id: string): Promise<Post> => {
    const res = await axiosInstance.get<ApiResponse<BackendPost>>(`/posts/${id}`)
    return adaptPost(unwrap(res))
  },

  create: async (body: {
    title: string
    excerpt: string
    body?: string
    location: string
    image: string
    galleryUrls?: string[]
    tags?: string[]
    visibility?: PostVisibility
  }): Promise<Post> => {
    const res = await axiosInstance.post<ApiResponse<BackendPost>>('/posts', body)
    return adaptPost(unwrap(res))
  },

  update: async (
    id: string,
    body: Partial<{
      title: string
      excerpt: string
      body: string
      location: string
      image: string
      galleryUrls: string[]
      tags: string[]
      visibility: PostVisibility
    }>,
  ): Promise<Post> => {
    const res = await axiosInstance.put<ApiResponse<BackendPost>>(`/posts/${id}`, body)
    return adaptPost(unwrap(res))
  },

  toggleLike: async (id: string): Promise<{ liked: boolean; likeCount: number }> => {
    const res = await axiosInstance.post<
      ApiResponse<{ liked: boolean; likeCount: number }>
    >(`/posts/${id}/like`)
    return unwrap(res)
  },

  /** List users who liked the given post. */
  likers: async (
    id: string,
    page = 1,
    pageSize = 30,
  ): Promise<PaginatedResponse<PostLiker>> => {
    const res = await axiosInstance.get<ApiResponse<PaginatedResponse<PostLiker>>>(
      `/posts/${id}/likes`,
      { params: { page, pageSize } },
    )
    return unwrapPage(res)
  },

  comments: async (id: string): Promise<PostComment[]> => {
    const res = await axiosInstance.get<ApiResponse<BackendComment[]>>(
      `/posts/${id}/comments`,
    )
    return unwrap(res).map(adaptComment)
  },

  addComment: async (id: string, content: string, parentId?: string): Promise<PostComment> => {
    const res = await axiosInstance.post<ApiResponse<BackendComment>>(
      `/posts/${id}/comments`,
      { content, parentId },
    )
    return adaptComment(unwrap(res))
  },

  /** Toggle like on a comment. Returns the new aggregate state. */
  toggleCommentLike: async (
    cid: string,
  ): Promise<{ liked: boolean; likeCount: number }> => {
    const res = await axiosInstance.post<
      ApiResponse<{ liked: boolean; likeCount: number }>
    >(`/posts/comments/${cid}/like`)
    return unwrap(res)
  },

  remove: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/posts/${id}`)
  },
}
