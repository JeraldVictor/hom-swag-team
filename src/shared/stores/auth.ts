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
 * - Restore session from storage on app boot (restoreSession)
 * - Clear all auth state and storage on logout (also revokes server-side token)
 */

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { locationTracker } from '@/shared/composables/useLocationTracker'
import { STORAGE_KEYS, Storage_Service } from '@/shared/lib/storage'
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
   * Hydrate auth state from persistent storage.
   * Call this once on app boot (App.vue onMounted) before the router resolves.
   *
   * Returns `true` if a valid session was restored, `false` otherwise.
   */
  async function restoreSession(): Promise<boolean> {
    const [storedAccessToken, storedRefreshToken, storedProfile, storedUserType] =
      await Promise.all([
        Storage_Service.getString(STORAGE_KEYS.accessToken),
        Storage_Service.getString(STORAGE_KEYS.refreshToken),
        Storage_Service.getJSON<UserProfile>(STORAGE_KEYS.userProfile),
        Storage_Service.getString(STORAGE_KEYS.userType),
      ])

    if (storedAccessToken && storedRefreshToken && storedProfile) {
      accessToken.value = storedAccessToken
      refreshToken.value = storedRefreshToken
      // Always ensure user_type is set — fall back to stored userType key
      user.value = {
        ...storedProfile,
        user_type: storedProfile.user_type ?? (storedUserType as UserType) ?? 'beautician',
      }
      return true
    }

    return false
  }

  /**
   * Persist an auth response to state and storage.
   *
   * Validates that `user.user_type` is `'rider' | 'beautician'`.
   * Throws an error and clears any stored tokens if the type is invalid.
   */
  async function login(authResponse: AuthResponse): Promise<void> {
    const {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: authUser,
    } = authResponse

    // Validate user_type before persisting anything
    if (!VALID_USER_TYPES.includes(authUser.user_type)) {
      await Storage_Service.clearAuth()
      throw new Error(
        `Invalid user_type "${authUser.user_type}". Expected "rider" or "beautician".`
      )
    }

    // Build a full UserProfile from the auth response user object
    const userProfile: UserProfile = {
      id: authUser.id,
      name: authUser.name,
      phone: authUser.phone,
      user_type: authUser.user_type,
      office_id: authUser.office_id,
    }

    // Persist to storage
    await Promise.all([
      Storage_Service.setString(STORAGE_KEYS.accessToken, newAccessToken),
      Storage_Service.setString(STORAGE_KEYS.refreshToken, newRefreshToken),
      Storage_Service.setString(STORAGE_KEYS.userType, authUser.user_type),
      Storage_Service.setJSON<UserProfile>(STORAGE_KEYS.userProfile, userProfile),
    ])

    // Update reactive state
    accessToken.value = newAccessToken
    refreshToken.value = newRefreshToken
    user.value = userProfile
  }

  /**
   * Update the stored user profile (e.g. after fetching full profile from GET /profile).
   */
  async function setUserProfile(profile: UserProfile): Promise<void> {
    // Preserve user_type from current state if the incoming profile doesn't have it
    // (server Beautician/Rider models don't include user_type)
    const merged: UserProfile = {
      ...profile,
      user_type: profile.user_type ?? user.value?.user_type ?? 'beautician',
    }
    user.value = merged
    await Storage_Service.setJSON<UserProfile>(STORAGE_KEYS.userProfile, merged)
  }

  /**
   * Clear all auth state from memory and storage.
   * Attempts to revoke the refresh token on the server first (best-effort).
   * Called on explicit sign-out or after an unrecoverable 401.
   */
  async function logout(): Promise<void> {
    // Stop location tracking before clearing tokens so any in-flight tick
    // that needs the token can still complete gracefully.
    locationTracker.stop()

    // Best-effort server-side token revocation — don't block logout on failure
    if (refreshToken.value) {
      try {
        const { logoutApi } = await import('@/shared/api/auth.service')
        await logoutApi({ refresh_token: refreshToken.value })
      } catch {
        // Silently ignore — local session must always be cleared
      }
    }

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

    const response = await apiClient.post<{ data: { accessToken: string; refreshToken: string } }>(
      '/auth/refresh',
      { refresh_token: currentRefreshToken }
    )

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data

    await Promise.all([
      Storage_Service.setString(STORAGE_KEYS.accessToken, newAccessToken),
      Storage_Service.setString(STORAGE_KEYS.refreshToken, newRefreshToken),
    ])

    accessToken.value = newAccessToken
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
    restoreSession,
    login,
    setUserProfile,
    logout,
    refreshTokens,
  }
})
