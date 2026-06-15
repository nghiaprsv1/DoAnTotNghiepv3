import type { AxiosResponse } from 'axios'
import type { ApiResponse, PaginatedResponse } from '@types/common'

/**
 * Unwraps the standard `ApiResponse<T>` envelope from the backend.
 * Use it after every axios call:
 *
 *   const trips = unwrap(await axiosInstance.get<ApiResponse<Trip[]>>('/trips'))
 */
export function unwrap<T>(res: AxiosResponse<ApiResponse<T>>): T {
  return res.data.data
}

/**
 * Unwraps an `ApiResponse<PaginatedResponse<T>>` envelope and returns just
 * the `data` array — useful when the FE doesn't care about pagination meta.
 */
export function unwrapList<T>(
  res: AxiosResponse<ApiResponse<PaginatedResponse<T>>>,
): T[] {
  return res.data.data.data
}

/** Pagination version that keeps total/page/pageSize. */
export function unwrapPage<T>(
  res: AxiosResponse<ApiResponse<PaginatedResponse<T>>>,
): PaginatedResponse<T> {
  return res.data.data
}
