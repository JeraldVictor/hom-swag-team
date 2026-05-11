/**
 * Typed Local Storage Service
 *
 * A type-safe wrapper around `@capacitor/preferences` providing structured
 * access to all persistent app data. This is the ONLY module that may import
 * from `@capacitor/preferences` — components and stores must use this service.
 */

import { Preferences } from '@capacitor/preferences'

// ---------------------------------------------------------------------------
// Storage Keys
// ---------------------------------------------------------------------------

/**
 * All persistent data keys used by the app.
 * Using `as const` ensures TypeScript infers the narrowest literal types,
 * enabling type-safe key lookups throughout the codebase.
 */
export const STORAGE_KEYS = {
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  userType: 'userType',
  userProfile: 'userProfile',
  deviceId: 'deviceId',
  onboardingComplete: 'onboardingComplete',
  lastActiveTab: 'lastActiveTab',
  pushNotificationToken: 'pushNotificationToken',
  pendingOrderEdits: 'pendingOrderEdits',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

// ---------------------------------------------------------------------------
// Storage Service Implementation
// ---------------------------------------------------------------------------

class StorageServiceClass {
  // -------------------------------------------------------------------------
  // String
  // -------------------------------------------------------------------------

  /**
   * Persist a string value under the given key.
   */
  async setString(key: StorageKey, value: string): Promise<void> {
    await Preferences.set({ key, value })
  }

  /**
   * Retrieve a string value. Returns `null` if the key has no stored value.
   */
  async getString(key: StorageKey): Promise<string | null> {
    const { value } = await Preferences.get({ key })
    return value
  }

  // -------------------------------------------------------------------------
  // JSON
  // -------------------------------------------------------------------------

  /**
   * Serialize `value` as JSON and persist it under the given key.
   */
  async setJSON<T>(key: StorageKey, value: T): Promise<void> {
    await Preferences.set({ key, value: JSON.stringify(value) })
  }

  /**
   * Deserialize and return the JSON value stored under the given key.
   * Returns `null` if the key is missing or the stored value is not valid JSON.
   */
  async getJSON<T>(key: StorageKey): Promise<T | null> {
    const { value } = await Preferences.get({ key })
    if (value === null || value === undefined) {
      return null
    }
    try {
      return JSON.parse(value) as T
    } catch {
      return null
    }
  }

  // -------------------------------------------------------------------------
  // Boolean
  // -------------------------------------------------------------------------

  /**
   * Persist a boolean value under the given key.
   */
  async setBoolean(key: StorageKey, value: boolean): Promise<void> {
    await Preferences.set({ key, value: String(value) })
  }

  /**
   * Retrieve a boolean value. Returns `null` if the key has no stored value.
   */
  async getBoolean(key: StorageKey): Promise<boolean | null> {
    const { value } = await Preferences.get({ key })
    if (value === null || value === undefined) {
      return null
    }
    return value === 'true'
  }

  // -------------------------------------------------------------------------
  // Number
  // -------------------------------------------------------------------------

  /**
   * Persist a number value under the given key.
   */
  async setNumber(key: StorageKey, value: number): Promise<void> {
    await Preferences.set({ key, value: String(value) })
  }

  /**
   * Retrieve a number value. Returns `null` if the key has no stored value.
   */
  async getNumber(key: StorageKey): Promise<number | null> {
    const { value } = await Preferences.get({ key })
    if (value === null || value === undefined) {
      return null
    }
    const parsed = Number(value)
    return isNaN(parsed) ? null : parsed
  }

  // -------------------------------------------------------------------------
  // Remove
  // -------------------------------------------------------------------------

  /**
   * Remove the value stored under the given key.
   */
  async remove(key: StorageKey): Promise<void> {
    await Preferences.remove({ key })
  }

  // -------------------------------------------------------------------------
  // Bulk operations
  // -------------------------------------------------------------------------

  /**
   * Remove all authentication-related keys in a single call.
   * Clears: accessToken, refreshToken, userType, userProfile.
   */
  async clearAuth(): Promise<void> {
    await Promise.all([
      Preferences.remove({ key: STORAGE_KEYS.accessToken }),
      Preferences.remove({ key: STORAGE_KEYS.refreshToken }),
      Preferences.remove({ key: STORAGE_KEYS.userType }),
      Preferences.remove({ key: STORAGE_KEYS.userProfile }),
    ])
  }

  /**
   * Remove all keys defined in `STORAGE_KEYS`.
   */
  async clearAll(): Promise<void> {
    await Promise.all(
      Object.values(STORAGE_KEYS).map((key) => Preferences.remove({ key }))
    )
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

/**
 * The singleton `Storage_Service` instance.
 * Import and use this directly — do not instantiate `StorageServiceClass`.
 */
export const Storage_Service = new StorageServiceClass()
