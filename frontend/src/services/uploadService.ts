import axiosInstance from './axiosInstance'
import { unwrap } from './unwrap'
import type { ApiResponse } from '@types/common'

/**
 * Wrapper around POST /upload/image and /upload/images. The BE returns paths
 * relative to /static — we resolve them against axios base URL so the FE can
 * use the resulting URL directly in an <img src>.
 */
const resolveStaticUrl = (relative: string): string => {
  if (!relative) return relative
  if (/^https?:\/\//i.test(relative)) return relative
  // axiosInstance.defaults.baseURL is something like 'http://host:port/api';
  // strip the trailing '/api' to reach the static mount point.
  const base = (axiosInstance.defaults.baseURL ?? '').replace(/\/api\/?$/, '')
  return `${base}${relative}`
}

export const uploadService = {
  /** Upload a single image. Returns the absolute URL ready for <img>. */
  uploadOne: async (file: File): Promise<string> => {
    const form = new FormData()
    form.append('file', file)
    const res = await axiosInstance.post<ApiResponse<{ url: string }>>(
      '/upload/image',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return resolveStaticUrl(unwrap(res).url)
  },

  /** Upload many images at once. */
  uploadMany: async (files: File[]): Promise<string[]> => {
    const form = new FormData()
    files.forEach((f) => form.append('files', f))
    const res = await axiosInstance.post<ApiResponse<{ urls: string[] }>>(
      '/upload/images',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return unwrap(res).urls.map(resolveStaticUrl)
  },
}
