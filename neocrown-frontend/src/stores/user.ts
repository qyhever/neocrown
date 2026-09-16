import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  logout as logoutApi,
  refreshAccessToken as refreshAccessTokenApi,
  type AuthTokenResponse,
} from '@/api/global'
import { getUserInfo, type UserInfo } from '@/api/user'

const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'

localStorage.removeItem(REFRESH_TOKEN_KEY)

export const useUserStore = defineStore('user', () => {
  const accessToken = ref(localStorage.getItem(ACCESS_TOKEN_KEY) || '')
  const userInfo = ref<UserInfo | null>(null)
  const userInfoLoading = ref(false)
  const displayName = computed(() => userInfo.value?.nickname || userInfo.value?.username || '用户')
  let userInfoPromise: Promise<UserInfo> | null = null

  function setAccessToken(tokens: AuthTokenResponse) {
    accessToken.value = tokens.accessToken
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
  }

  async function refreshAccessToken() {
    const response = await refreshAccessTokenApi()

    setAccessToken(response)
    return response.accessToken
  }

  function fetchUserInfo(force = false) {
    if (userInfo.value && !force) {
      return Promise.resolve(userInfo.value)
    }
    if (userInfoPromise) {
      return userInfoPromise
    }

    userInfoLoading.value = true
    userInfoPromise = getUserInfo()
      .then((info) => {
        userInfo.value = info
        return info
      })
      .finally(() => {
        userInfoLoading.value = false
        userInfoPromise = null
      })

    return userInfoPromise
  }

  function clearSession() {
    accessToken.value = ''
    userInfo.value = null
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }

  async function logout() {
    try {
      await logoutApi()
    } finally {
      clearSession()
    }
  }

  return {
    accessToken,
    userInfo,
    userInfoLoading,
    displayName,
    setAccessToken,
    refreshAccessToken,
    fetchUserInfo,
    clearSession,
    logout,
  }
})
