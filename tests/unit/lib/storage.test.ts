/**
 * Unit tests for Storage_Service (src/lib/storage.ts)
 *
 * @capacitor/preferences is mocked so tests run in jsdom without native plugins.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock @capacitor/preferences before importing the module under test
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

// Import after mock is set up
import { Storage_Service, STORAGE_KEYS } from '@/lib/storage'
import { Preferences } from '@capacitor/preferences'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clearMockStore() {
  for (const key of Object.keys(mockStore)) {
    delete mockStore[key]
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('STORAGE_KEYS', () => {
  it('is defined as an object', () => {
    expect(STORAGE_KEYS).toBeDefined()
    expect(typeof STORAGE_KEYS).toBe('object')
  })

  it('contains all required keys', () => {
    expect(STORAGE_KEYS).toHaveProperty('accessToken', 'accessToken')
    expect(STORAGE_KEYS).toHaveProperty('refreshToken', 'refreshToken')
    expect(STORAGE_KEYS).toHaveProperty('userType', 'userType')
    expect(STORAGE_KEYS).toHaveProperty('userProfile', 'userProfile')
    expect(STORAGE_KEYS).toHaveProperty('deviceId', 'deviceId')
  })

  it('has string values for all keys', () => {
    for (const [k, v] of Object.entries(STORAGE_KEYS)) {
      expect(typeof v, `STORAGE_KEYS.${k} should be a string`).toBe('string')
    }
  })
})

describe('Storage_Service', () => {
  beforeEach(() => {
    clearMockStore()
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // setString / getString
  // -------------------------------------------------------------------------

  describe('setString / getString', () => {
    it('stores and retrieves a string value', async () => {
      await Storage_Service.setString(STORAGE_KEYS.accessToken, 'my-token')
      const result = await Storage_Service.getString(STORAGE_KEYS.accessToken)
      expect(result).toBe('my-token')
    })

    it('returns null for a key that has never been set', async () => {
      const result = await Storage_Service.getString(STORAGE_KEYS.accessToken)
      expect(result).toBeNull()
    })

    it('delegates set to Preferences.set', async () => {
      await Storage_Service.setString(STORAGE_KEYS.deviceId, 'device-123')
      expect(Preferences.set).toHaveBeenCalledWith({ key: 'deviceId', value: 'device-123' })
    })

    it('delegates get to Preferences.get', async () => {
      await Storage_Service.getString(STORAGE_KEYS.deviceId)
      expect(Preferences.get).toHaveBeenCalledWith({ key: 'deviceId' })
    })
  })

  // -------------------------------------------------------------------------
  // setJSON / getJSON
  // -------------------------------------------------------------------------

  describe('setJSON / getJSON', () => {
    it('stores and retrieves a plain object', async () => {
      const profile = { id: 1, name: 'Alice', role: 'beautician' }
      await Storage_Service.setJSON(STORAGE_KEYS.userProfile, profile)
      const result = await Storage_Service.getJSON<typeof profile>(STORAGE_KEYS.userProfile)
      expect(result).toEqual(profile)
    })

    it('stores and retrieves an array', async () => {
      const data = [1, 2, 3]
      await Storage_Service.setJSON(STORAGE_KEYS.userProfile, data)
      const result = await Storage_Service.getJSON<number[]>(STORAGE_KEYS.userProfile)
      expect(result).toEqual(data)
    })

    it('returns null for a missing key', async () => {
      const result = await Storage_Service.getJSON(STORAGE_KEYS.userProfile)
      expect(result).toBeNull()
    })

    it('returns null for invalid JSON (catches parse errors)', async () => {
      // Directly inject malformed JSON into the mock store
      mockStore[STORAGE_KEYS.userProfile] = '{ not valid json }'
      const result = await Storage_Service.getJSON(STORAGE_KEYS.userProfile)
      expect(result).toBeNull()
    })

    it('returns null for an empty string stored value', async () => {
      mockStore[STORAGE_KEYS.userProfile] = ''
      const result = await Storage_Service.getJSON(STORAGE_KEYS.userProfile)
      expect(result).toBeNull()
    })

    it('serializes value as JSON when calling Preferences.set', async () => {
      const obj = { foo: 'bar' }
      await Storage_Service.setJSON(STORAGE_KEYS.userProfile, obj)
      expect(Preferences.set).toHaveBeenCalledWith({
        key: 'userProfile',
        value: JSON.stringify(obj),
      })
    })
  })

  // -------------------------------------------------------------------------
  // setBoolean / getBoolean
  // -------------------------------------------------------------------------

  describe('setBoolean / getBoolean', () => {
    it('stores and retrieves true', async () => {
      await Storage_Service.setBoolean(STORAGE_KEYS.onboardingComplete, true)
      const result = await Storage_Service.getBoolean(STORAGE_KEYS.onboardingComplete)
      expect(result).toBe(true)
    })

    it('stores and retrieves false', async () => {
      await Storage_Service.setBoolean(STORAGE_KEYS.onboardingComplete, false)
      const result = await Storage_Service.getBoolean(STORAGE_KEYS.onboardingComplete)
      expect(result).toBe(false)
    })

    it('returns null for a missing key', async () => {
      const result = await Storage_Service.getBoolean(STORAGE_KEYS.onboardingComplete)
      expect(result).toBeNull()
    })

    it('stores boolean as the string "true" or "false"', async () => {
      await Storage_Service.setBoolean(STORAGE_KEYS.onboardingComplete, true)
      expect(Preferences.set).toHaveBeenCalledWith({ key: 'onboardingComplete', value: 'true' })

      await Storage_Service.setBoolean(STORAGE_KEYS.onboardingComplete, false)
      expect(Preferences.set).toHaveBeenCalledWith({ key: 'onboardingComplete', value: 'false' })
    })
  })

  // -------------------------------------------------------------------------
  // setNumber / getNumber
  // -------------------------------------------------------------------------

  describe('setNumber / getNumber', () => {
    it('stores and retrieves a positive integer', async () => {
      await Storage_Service.setNumber(STORAGE_KEYS.lastActiveTab, 2)
      const result = await Storage_Service.getNumber(STORAGE_KEYS.lastActiveTab)
      expect(result).toBe(2)
    })

    it('stores and retrieves zero', async () => {
      await Storage_Service.setNumber(STORAGE_KEYS.lastActiveTab, 0)
      const result = await Storage_Service.getNumber(STORAGE_KEYS.lastActiveTab)
      expect(result).toBe(0)
    })

    it('stores and retrieves a float', async () => {
      await Storage_Service.setNumber(STORAGE_KEYS.lastActiveTab, 3.14)
      const result = await Storage_Service.getNumber(STORAGE_KEYS.lastActiveTab)
      expect(result).toBe(3.14)
    })

    it('returns null for a missing key', async () => {
      const result = await Storage_Service.getNumber(STORAGE_KEYS.lastActiveTab)
      expect(result).toBeNull()
    })

    it('stores number as a string', async () => {
      await Storage_Service.setNumber(STORAGE_KEYS.lastActiveTab, 42)
      expect(Preferences.set).toHaveBeenCalledWith({ key: 'lastActiveTab', value: '42' })
    })
  })

  // -------------------------------------------------------------------------
  // remove
  // -------------------------------------------------------------------------

  describe('remove', () => {
    it('removes a stored key', async () => {
      await Storage_Service.setString(STORAGE_KEYS.accessToken, 'token-abc')
      await Storage_Service.remove(STORAGE_KEYS.accessToken)
      const result = await Storage_Service.getString(STORAGE_KEYS.accessToken)
      expect(result).toBeNull()
    })

    it('delegates to Preferences.remove', async () => {
      await Storage_Service.remove(STORAGE_KEYS.refreshToken)
      expect(Preferences.remove).toHaveBeenCalledWith({ key: 'refreshToken' })
    })

    it('does not throw when removing a key that does not exist', async () => {
      await expect(Storage_Service.remove(STORAGE_KEYS.deviceId)).resolves.not.toThrow()
    })
  })

  // -------------------------------------------------------------------------
  // clearAuth
  // -------------------------------------------------------------------------

  describe('clearAuth', () => {
    it('removes accessToken, refreshToken, userType, and userProfile', async () => {
      // Seed all auth keys
      await Storage_Service.setString(STORAGE_KEYS.accessToken, 'access')
      await Storage_Service.setString(STORAGE_KEYS.refreshToken, 'refresh')
      await Storage_Service.setString(STORAGE_KEYS.userType, 'beautician')
      await Storage_Service.setJSON(STORAGE_KEYS.userProfile, { id: 1 })

      await Storage_Service.clearAuth()

      expect(await Storage_Service.getString(STORAGE_KEYS.accessToken)).toBeNull()
      expect(await Storage_Service.getString(STORAGE_KEYS.refreshToken)).toBeNull()
      expect(await Storage_Service.getString(STORAGE_KEYS.userType)).toBeNull()
      expect(await Storage_Service.getJSON(STORAGE_KEYS.userProfile)).toBeNull()
    })

    it('does not remove non-auth keys', async () => {
      await Storage_Service.setString(STORAGE_KEYS.deviceId, 'device-xyz')
      await Storage_Service.clearAuth()
      const deviceId = await Storage_Service.getString(STORAGE_KEYS.deviceId)
      expect(deviceId).toBe('device-xyz')
    })

    it('calls Preferences.remove for each auth key', async () => {
      await Storage_Service.clearAuth()
      const removedKeys = (Preferences.remove as ReturnType<typeof vi.fn>).mock.calls.map(
        (call: [{ key: string }]) => call[0].key
      )
      expect(removedKeys).toContain('accessToken')
      expect(removedKeys).toContain('refreshToken')
      expect(removedKeys).toContain('userType')
      expect(removedKeys).toContain('userProfile')
    })
  })

  // -------------------------------------------------------------------------
  // clearAll
  // -------------------------------------------------------------------------

  describe('clearAll', () => {
    it('removes all keys defined in STORAGE_KEYS', async () => {
      // Seed every key
      await Storage_Service.setString(STORAGE_KEYS.accessToken, 'a')
      await Storage_Service.setString(STORAGE_KEYS.refreshToken, 'b')
      await Storage_Service.setString(STORAGE_KEYS.userType, 'rider')
      await Storage_Service.setJSON(STORAGE_KEYS.userProfile, { id: 2 })
      await Storage_Service.setString(STORAGE_KEYS.deviceId, 'dev')
      await Storage_Service.setBoolean(STORAGE_KEYS.onboardingComplete, true)
      await Storage_Service.setNumber(STORAGE_KEYS.lastActiveTab, 1)
      await Storage_Service.setString(STORAGE_KEYS.pushNotificationToken, 'push-token')

      await Storage_Service.clearAll()

      for (const key of Object.values(STORAGE_KEYS)) {
        const raw = mockStore[key]
        expect(raw, `key "${key}" should be removed after clearAll`).toBeUndefined()
      }
    })

    it('calls Preferences.remove for every key in STORAGE_KEYS', async () => {
      await Storage_Service.clearAll()
      const removedKeys = (Preferences.remove as ReturnType<typeof vi.fn>).mock.calls.map(
        (call: [{ key: string }]) => call[0].key
      )
      for (const key of Object.values(STORAGE_KEYS)) {
        expect(removedKeys).toContain(key)
      }
    })
  })
})
