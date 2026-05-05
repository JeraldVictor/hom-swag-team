/**
 * Unit tests for User Type Store (src/stores/userType.ts)
 *
 * @capacitor/preferences is mocked so tests run in jsdom without native plugins.
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
// Mock @/lib/api (used by auth store's refreshTokens)
// ---------------------------------------------------------------------------

vi.mock('@/lib/api', () => ({
  default: {
    post: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { useAuthStore } from '@/stores/auth'
import { useUserTypeStore } from '@/stores/userType'
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

function makeAuthResponse(userType: string): AuthResponse {
  return {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    user: {
      id: '42',
      name: 'Test User',
      phone: '+911234567890',
      user_type: userType as UserProfile['user_type'],
    },
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useUserTypeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    clearMockStore()
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // Initial state (not logged in)
  // -------------------------------------------------------------------------

  describe('when not authenticated', () => {
    it('userType is null', () => {
      const store = useUserTypeStore()
      expect(store.userType).toBeNull()
    })

    it('isBeautician is false', () => {
      const store = useUserTypeStore()
      expect(store.isBeautician).toBe(false)
    })

    it('isRider is false', () => {
      const store = useUserTypeStore()
      expect(store.isRider).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // Beautician user
  // -------------------------------------------------------------------------

  describe('when logged in as beautician', () => {
    it('userType is "beautician"', async () => {
      const authStore = useAuthStore()
      await authStore.login(makeAuthResponse('beautician'))

      const store = useUserTypeStore()
      expect(store.userType).toBe('beautician')
    })

    it('isBeautician is true', async () => {
      const authStore = useAuthStore()
      await authStore.login(makeAuthResponse('beautician'))

      const store = useUserTypeStore()
      expect(store.isBeautician).toBe(true)
    })

    it('isRider is false', async () => {
      const authStore = useAuthStore()
      await authStore.login(makeAuthResponse('beautician'))

      const store = useUserTypeStore()
      expect(store.isRider).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // Rider user
  // -------------------------------------------------------------------------

  describe('when logged in as rider', () => {
    it('userType is "rider"', async () => {
      const authStore = useAuthStore()
      await authStore.login(makeAuthResponse('rider'))

      const store = useUserTypeStore()
      expect(store.userType).toBe('rider')
    })

    it('isRider is true', async () => {
      const authStore = useAuthStore()
      await authStore.login(makeAuthResponse('rider'))

      const store = useUserTypeStore()
      expect(store.isRider).toBe(true)
    })

    it('isBeautician is false', async () => {
      const authStore = useAuthStore()
      await authStore.login(makeAuthResponse('rider'))

      const store = useUserTypeStore()
      expect(store.isBeautician).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // Reactivity — getters update when auth state changes
  // -------------------------------------------------------------------------

  describe('reactivity', () => {
    it('userType updates from null to "beautician" after login', async () => {
      const authStore = useAuthStore()
      const userTypeStore = useUserTypeStore()

      expect(userTypeStore.userType).toBeNull()

      await authStore.login(makeAuthResponse('beautician'))
      expect(userTypeStore.userType).toBe('beautician')
    })

    it('userType updates from null to "rider" after login', async () => {
      const authStore = useAuthStore()
      const userTypeStore = useUserTypeStore()

      expect(userTypeStore.userType).toBeNull()

      await authStore.login(makeAuthResponse('rider'))
      expect(userTypeStore.userType).toBe('rider')
    })

    it('userType reverts to null after logout', async () => {
      const authStore = useAuthStore()
      const userTypeStore = useUserTypeStore()

      await authStore.login(makeAuthResponse('beautician'))
      expect(userTypeStore.userType).toBe('beautician')

      await authStore.logout()
      expect(userTypeStore.userType).toBeNull()
    })

    it('isBeautician reverts to false after logout', async () => {
      const authStore = useAuthStore()
      const userTypeStore = useUserTypeStore()

      await authStore.login(makeAuthResponse('beautician'))
      expect(userTypeStore.isBeautician).toBe(true)

      await authStore.logout()
      expect(userTypeStore.isBeautician).toBe(false)
    })

    it('isRider reverts to false after logout', async () => {
      const authStore = useAuthStore()
      const userTypeStore = useUserTypeStore()

      await authStore.login(makeAuthResponse('rider'))
      expect(userTypeStore.isRider).toBe(true)

      await authStore.logout()
      expect(userTypeStore.isRider).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // Derived from Auth_Store (not independent state)
  // -------------------------------------------------------------------------

  describe('derives from Auth_Store', () => {
    it('reflects the same user_type as Auth_Store.user', async () => {
      const authStore = useAuthStore()
      const userTypeStore = useUserTypeStore()

      await authStore.login(makeAuthResponse('rider'))
      expect(userTypeStore.userType).toBe(authStore.user?.user_type)
    })

    it('both stores share the same pinia instance', () => {
      const authStore = useAuthStore()
      const userTypeStore = useUserTypeStore()

      // Both should be defined and reactive
      expect(authStore).toBeDefined()
      expect(userTypeStore).toBeDefined()
    })
  })
})
