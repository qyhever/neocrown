import { post } from '@/utils/request'

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthTokenResponse {
  accessToken: string
}

export function login(data: LoginRequest) {
  return post<AuthTokenResponse>('/auth/login', data)
}

export function refreshAccessToken() {
  return post<AuthTokenResponse>('/auth/refresh')
}

export function logout() {
  return post<null>('/auth/logout')
}
