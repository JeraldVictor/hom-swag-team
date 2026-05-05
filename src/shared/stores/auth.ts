/**
 * Auth Store
 *
 * Manages authentication state, tokens, and user identity.
 * Uses Composition API style with defineStore.
 *
 * Responsibilities:
 * - Hold accessToken, refreshToken, and user profile in reactive state
 * - Persist tokens and user data to Storage_Service on login
 * - Validate user_type on login — reject if not 'rider' | 'beautician'
 * - Clear all auth state and storage on logout
 * - Refresh tokens via POST /auth/refresh
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { Storage_Service, STORAGE_KEYS } from '@/shared/lib/storage'
import type { AuthResponse } from '@/shared/models/auth.model'
import type { UserProfile, UserType } from '@/shared/models/user.model'

const VALID_USER_TYPES: UserType[] = ['rider', 'beautician']

export const useAuthStore = defineStore('auth', () => {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const accessToken = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)
  const user = ref<UserProfile | null>(null)

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  /** True when an access token is present in state. */
  const isAuthenticated = computed(() => !!accessToken.value)

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /**
   * Persist an auth response to state and storage.
   *
   * Validates that `user.user_type` is `'rider' | 'beautician'`.
   * Throws an error and clears any stored tokens if the type is invalid.
   */
  async function login(authResponse: AuthResponse): Promise<void> {
    const { access_token, refresh_token, user: userProfile } = authResponse

    // Validate user_type before persisting anything
    if (!VALID_USER_TYPES.includes(userProfile.user_type)) {
      // Clear any previously stored tokens to leave a clean state
      await Storage_Service.clearAuth()
      throw new Error(
        `Invalid user_type "${userProfile.user_type}". Expected "rider" or "beautician".`
      )
    }

    // Persist to storage
    await Promise.all([
      Storage_Service.setString(STORAGE_KEYS.accessToken, access_token),
      Storage_Service.setString(STORAGE_KEYS.refreshToken, refresh_token),
      Storage_Service.setString(STORAGE_KEYS.userType, userProfile.user_type),
      Storage_Service.setJSON<UserProfile>(STORAGE_KEYS.userProfile, userProfile),
    ])

    // Update reactive state
    accessToken.value = access_token
    refreshToken.value = refresh_token
    user.value = userProfile
  }

  /**
   * Clear all auth state from memory and storage.
   * Called on explicit sign-out or after an unrecoverable 401.
   */
  async function logout(): Promise<void> {
    await Storage_Service.clearAuth()

    accessToken.value = null
    refreshToken.value = null
    user.value = null
  }

  /**
   * Refresh the access/refresh token pair via POST /auth/refresh.
   * Updates both state and storage with the new tokens.
   */
  async function refreshTokens(): Promise<void> {
    // Lazy import to avoid circular dependency with api.ts
    const apiClient = (await import('@/shared/lib/api')).default

    const currentRefreshToken = refreshToken.value
    if (!currentRefreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await apiClient.post<{ access_token: string; refresh_token: string }>(
      '/auth/refresh',
      { refresh_token: currentRefreshToken }
    )

    const { access_token, refresh_token: newRefreshToken } = response.data

    await Promise.all([
      Storage_Service.setString(STORAGE_KEYS.accessToken, access_token),
      Storage_Service.setString(STORAGE_KEYS.refreshToken, newRefreshToken),
    ])

    accessToken.value = access_token
    refreshToken.value = newRefreshToken
  }

  return {
    // State
    accessToken,
    refreshToken,
    user,
    // Getters
    isAuthenticated,
    // Actions
    login,
    logout,
    refreshTokens,
  }
})
