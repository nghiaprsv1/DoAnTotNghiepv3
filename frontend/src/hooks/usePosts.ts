import { useQuery } from '@tanstack/react-query'
import { postService } from '@services/postService'

export function usePosts(params?: { feed?: string; tag?: string; authorId?: string }) {
  return useQuery({
    queryKey: ['posts', params],
    queryFn: () => postService.list(params),
  })
}

/** Posts authored by a specific user — used on public profile page. */
export function useUserPosts(userId: string | undefined) {
  return useQuery({
    queryKey: ['posts', 'by-author', userId],
    queryFn: () => postService.list({ authorId: userId }),
    enabled: Boolean(userId),
  })
}

export function usePost(id: string | undefined) {
  return useQuery({
    queryKey: ['post', id],
    queryFn: () => postService.getById(id as string),
    enabled: Boolean(id),
  })
}

export function usePostComments(id: string | undefined) {
  return useQuery({
    queryKey: ['post', id, 'comments'],
    queryFn: () => postService.comments(id as string),
    enabled: Boolean(id),
  })
}

/** Lazy: only fetch the likers list when `id` is set (modal opened). */
export function usePostLikers(id: string | undefined, page = 1) {
  return useQuery({
    queryKey: ['post', id, 'likers', page],
    queryFn: () => postService.likers(id as string, page),
    enabled: Boolean(id),
  })
}
