import { useQuery } from '@tanstack/react-query'
import { userService } from '@services/userService'

export function useUserProfile(id: string | undefined) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => userService.getProfile(id as string),
    enabled: Boolean(id),
  })
}

export function useFollowers(id: string | undefined) {
  return useQuery({
    queryKey: ['user', id, 'followers'],
    queryFn: () => userService.followers(id as string),
    enabled: Boolean(id),
  })
}

export function useFollowing(id: string | undefined) {
  return useQuery({
    queryKey: ['user', id, 'following'],
    queryFn: () => userService.following(id as string),
    enabled: Boolean(id),
  })
}
