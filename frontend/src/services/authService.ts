import axiosInstance from './axiosInstance'
import type { ApiResponse } from '@types/common'
import type { User, LoginCredentials, RegisterCredentials, AuthTokens } from '@types/user'

export interface RegisterResult {
  email: string
  requiresVerification: true
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> => {
    const { data } = await axiosInstance.post('/auth/login', credentials)
    return data
  },

  register: async (credentials: RegisterCredentials): Promise<ApiResponse<RegisterResult>> => {
    const { data } = await axiosInstance.post('/auth/register', credentials)
    return data
  },

  verifyEmail: async (
    email: string,
    code: string,
  ): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> => {
    const { data } = await axiosInstance.post('/auth/verify-email', { email, code })
    return data
  },

  resendVerification: async (email: string): Promise<ApiResponse<{ email: string; sent: boolean }>> => {
    const { data } = await axiosInstance.post('/auth/resend-verification', { email })
    return data
  },

  logout: async (): Promise<void> => {
    await axiosInstance.post('/auth/logout')
  },

  refreshToken: async (refreshToken: string): Promise<ApiResponse<AuthTokens>> => {
    const { data } = await axiosInstance.post('/auth/refresh', { refreshToken })
    return data
  },

  getProfile: async (): Promise<ApiResponse<User>> => {
    const { data } = await axiosInstance.get('/auth/profile')
    return data
  },
}
