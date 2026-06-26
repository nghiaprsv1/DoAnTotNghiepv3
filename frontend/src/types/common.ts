// Common shared types

export interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
  statusCode: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface PaginationParams {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface SelectOption<T = string> {
  label: string
  value: T
  disabled?: boolean
}

export type Nullable<T> = T | null
export type Optional<T> = T | undefined
export type ID = string | number
