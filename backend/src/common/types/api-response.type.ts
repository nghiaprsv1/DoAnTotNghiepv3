/**
 * Standard API response shape — must mirror `src/types/common.ts` on the frontend.
 *
 * All controllers should return `data` directly; the global interceptor wraps it.
 */
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
