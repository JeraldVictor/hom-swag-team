/**
 * Unit tests for Auth Store (src/stores/auth.ts)
 *
 * @capacitor/preferences is mocked so tests run in jsdom without native plugins.
 * @/lib/api is mocked to avoid real HTTP calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// ---------------------------------------------------------------------------
// Mock @capacitor/preferences
// ---------------------------------------------------------------------------

const mockStore: Record<string, string> = {}

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      mockStore[key] = value
    }),
    get: vi.fn(async ({ key }: { key: string }) => ({
      value: Object.prototype.hasOwnProperty.call(mockStore, key) ? mockStore[key] : null,
    })),
    remove: vi.fn(async ({ key }: { key: string }) => {
      delete mockStore[key]
    }),
  },
}))

// ---------------------------------------------------------------------------
// Mock @/lib/api (used by refreshTokens)
// ---------------------------------------------------------------------------

const mockApiPost = vi.fn()

vi.mock('@/lib/api', () => ({
  default: {
    post: mockApiPost,
  },
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { useAuthStore } from '@/stores/auth'
import { STORAGE_KEYS } from '@/lib/storage'
import type { AuthResponse } from '@/models/auth.model'
import type { UserProfile } from '@/models/user.model'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clearMockStore() {
  for (const key of Object.keys(mockStore)) {
    delete mockStore[key]
  }
}

function makeAuthResponse(userType: string = 'beautician'): AuthResponse {
  return {
    access_token: 'access-token-abc',
    refresh_token: 'refresh-token-xyz',
    user: {
      id: '1',
      name: 'Alice',
      phone: '+911234567890',
      user_type: userType as UserProfile['user_type'],
    },
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    clearMockStore()
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------

  describe('initial state', () => {
    it('starts with null accessToken', () => {
      const store = useAuthStore()
      expect(store.accessToken).toBeNull()
    })

    it('starts with null refreshToken', () => {
      const store = useAuthStore()
      expect(store.refreshToken).toBeNull()
    })

    it('starts with null user', () => {
      const store = useAuthStore()
      expect(store.user).toBeNull()
    })

    it('isAuthenticated is false when no token is set', () => {
      const store = useAuthStore()
      expect(store.isAuthenticated).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // login()
  // -------------------------------------------------------------------------

  describe('login()', () => {
    it('sets accessToken in state', async () => {
      const store = useAuthStore()
      await store.login(makeAuthResponse('beautician'))
      expect(store.accessToken).toBe('access-token-abc')
    })

    it('sets refreshToken in state', async () => {
      const store = useAuthStore()
      await store.login(makeAuthResponse('beautician'))
      expect(store.refreshToken).toBe('refresh-token-xyz')
    })

    it('sets user in state', async () => {
      const store = useAuthStore()
      const authResponse = makeAuthResponse('beautician')
      await store.login(authResponse)
      expect(store.user).toEqual(authResponse.user)
    })

    it('isAuthenticated becomes true after login', async () => {
      const store = useAuthStore()
      await store.login(makeAuthResponse('beautician'))
      expect(store.isAuthenticated).toBe(true)
    })

    it('persists accessToken to storage', async () => {
      const store = useAuthStore()
      await store.login(makeAuthResponse('beautician'))
      expect(mockStore[STORAGE_KEYS.accessToken]).toBe('access-token-abc')
    })

    it('persists refreshToken to storage', async () => {
      const store = useAuthStore()
      await store.login(makeAuthResponse('beautician'))
      expect(mockStore[STORAGE_KEYS.refreshToken]).toBe('refresh-token-xyz')
    })

    it('persists userType to storage', async () => {
      const store = useAuthStore()
      await store.login(makeAuthResponse('beautician'))
      expect(mockStore[STORAGE_KEYS.userType]).toBe('beautician')
    })

    it('persists userProfile as JSON to storage', async () => {
      const store = useAuthStore()
      const authResponse = makeAuthResponse('rider')
      await store.login(authResponse)
      const stored = JSON.parse(mockStore[STORAGE_KEYS.userProfile])
      expect(stored).toEqual(authResponse.user)
    })

    it('works for rider user_type', async () => {
      const store = useAuthStore()
      await store.login(makeAuthResponse('rider'))
      expect(store.user?.user_type).toBe('rider')
    })

    it('works for beautician user_type', async () => {
      const store = useAuthStore()
      await store.login(makeAuthResponse('beautician'))
      expect(store.user?.user_type).toBe('beautician')
    })
  })

  // -------------------------------------------------------------------------
  // login() — invalid user_type rejection
  // -------------------------------------------------------------------------

  describe('login() — invalid user_type', () => {
    it('throws an error when user_type is invalid', async () => {
      const store = useAuthStore()
      await expect(store.login(makeAuthResponse('admin'))).rejects.toThrow()
    })

    it('throws an error mentioning the invalid user_type', async () => {
      const store = useAuthStore()
      await expect(store.login(makeAuthResponse('manager'))).rejects.toThrow('manager')
    })

    it('does not set accessToken in state when user_type is invalid', async () => {
      const store = useAuthStore()
      try {
        await store.login(makeAuthResponse('unknown'))
      } catch {
        // expected
      }
      expect(store.accessToken).toBeNull()
    })

    it('does not set user in state when user_type is invalid', async () => {
      const store = useAuthStore()
      try {
        await store.login(makeAuthResponse('superadmin'))
      } catch {
        // expected
      }
      expect(store.user).toBeNull()
    })

    it('clears storage when user_type is invalid', async () => {
      // Pre-seed some tokens to simulate a previous session
      mockStore[STORAGE_KEYS.accessToken] = 'old-token'
      mockStore[STORAGE_KEYS.refreshToken] = 'old-refresh'

      const store = useAuthStore()
      try {
        await store.login(makeAuthResponse('invalid'))
      } catch {
        // expected
      }

      expect(mockStore[STORAGE_KEYS.accessToken]).toBeUndefined()
      expect(mockStore[STORAGE_KEYS.refreshToken]).toBeUndefined()
    })
  })

  // -------------------------------------------------------------------------
  // logout()
  // -------------------------------------------------------------------------

  describe('logout()', () => {
    it('clears accessToken from state', async () => {
      const store = useAuthStore()
      await store.login(makeAuthResponse('beautician'))
      await store.logout()
      expect(store.accessToken).toBeNull()
    })

    it('clears refreshToken from state', async () => {
      const store = useAuthStore()
      await store.login(makeAuthResponse('beautician'))
      await store.logout()
      expect(store.refreshToken).toBeNull()
    })

    it('clears user from state', async () => {
      const store = useAuthStore()
      await store.login(makeAuthResponse('beautician'))
      await store.logout()
      expect(store.user).toBeNull()
    })

    it('isAuthenticated becomes false after logout', async () => {
      const store = useAuthStore()
      await store.login(makeAuthResponse('beautician'))
      await store.logout()
      expect(store.isAuthenticated).toBe(false)
    })

    it('clears auth keys from storage', async () => {
      const store = useAuthStore()
      await store.login(makeAuthResponse('rider'))
      await store.logout()

      expect(mockStore[STORAGE_KEYS.accessToken]).toBeUndefined()
      expect(mockStore[STORAGE_KEYS.refreshToken]).toBeUndefined()
      expect(mockStore[STORAGE_KEYS.userType]).toBeUndefined()
      expect(mockStore[STORAGE_KEYS.userProfile]).toBeUndefined()
    })

    it('can be called when already logged out without throwing', async () => {
      const store = useAuthStore()
      await expect(store.logout()).resolves.not.toThrow()
    })
  })

  // -------------------------------------------------------------------------
  // isAuthenticated getter
  // -------------------------------------------------------------------------

  describe('isAuthenticated getter', () => {
    it('is false when accessToken is null', () => {
      const store = useAuthStore()
      expect(store.isAuthenticated).toBe(false)
    })

    it('is true when accessToken is set', async () => {
      const store = useAuthStore()
      await store.login(makeAuthResponse('beautician'))
      expect(store.isAuthenticated).toBe(true)
    })

    it('reacts to logout — becomes false', async () => {
      const store = useAuthStore()
      await store.login(makeAuthResponse('rider'))
      expect(store.isAuthenticated).toBe(true)
      await store.logout()
      expect(store.isAuthenticated).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // refreshTokens()
  // -------------------------------------------------------------------------

  describe('refreshTokens()', () => {
    it('calls POST /auth/refresh with the current refresh token', async () => {
      const store = useAuthStore()
      await store.login(makeAuthResponse('beautician'))

      mockApiPost.mockResolvedValueOnce({
        data: { access_token: 'new-access', refresh_token: 'new-refresh' },
      })

      await store.refreshTokens()

      expect(mockApiPost).toHaveBeenCalledWith('/auth/refresh', {
        refresh_token: 'refresh-token-xyz',
      })
    })

    it('updates accessToken in state after refresh', async () => {
      const store = useAuthStore()
      await store.login(makeAuthResponse('beautician'))

      mockApiPost.mockResolvedValueOnce({
        data: { access_token: 'new-access', refresh_token: 'new-refresh' },
      })

      await store.refreshTokens()
      expect(store.accessToken).toBe('new-access')
    })

    it('updates refreshToken in state after refresh', async () => {
      const store = useAuthStore()
      await store.login(makeAuthResponse('beautician'))

      mockApiPost.mockResolvedValueOnce({
        data: { access_token: 'new-access', refresh_token: 'new-refresh' },
      })

      await store.refreshTokens()
      expect(store.refreshToken).toBe('new-refresh')
    })

    it('throws when no refresh token is available', async () => {
      const store = useAuthStore()
      // Do not login — refreshToken is null
      await expect(store.refreshTokens()).rejects.toThrow()
    })
  })
})
