/**
 * Unit tests for src/lib/location.service.ts
 *
 * Covers:
 *  - Permission request delegation to @capacitor/geolocation
 *  - Watch interval clamping (must not exceed 30 000 ms)
 *  - stopWatching delegates to Geolocation.clearWatch
 *  - startWatching invokes the caller callback with coordinates
 *  - startWatching calls pushLocation on each update
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock @capacitor/geolocation ─────────────────────────────────────────────
// vi.mock is hoisted, so factories must not reference outer variables.

vi.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    requestPermissions: vi.fn(),
    getCurrentPosition: vi.fn(),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  },
}))

// ─── Mock src/api/location.service ───────────────────────────────────────────

vi.mock('@/shared/api/location.service', () => ({
  getOfficeId: vi.fn(),
  pushLocation: vi.fn(),
}))

// ─── Import after mocks are registered ───────────────────────────────────────

import { Geolocation } from '@capacitor/geolocation'
import { getOfficeId, pushLocation } from '@/shared/api/location.service'
import { locationService, MAX_WATCH_INTERVAL_MS } from '@/shared/lib/location.service'

// Typed references to the mocked functions.
const mockRequestPermissions = vi.mocked(Geolocation.requestPermissions)
const mockGetCurrentPosition = vi.mocked(Geolocation.getCurrentPosition)
const mockWatchPosition = vi.mocked(Geolocation.watchPosition)
const mockClearWatch = vi.mocked(Geolocation.clearWatch)
const mockPushLocation = vi.mocked(pushLocation)
const mockGetOfficeId = vi.mocked(getOfficeId)

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('LocationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── requestPermission ──────────────────────────────────────────────────────

  describe('requestPermission()', () => {
    it('calls Geolocation.requestPermissions and returns the location status', async () => {
      mockRequestPermissions.mockResolvedValueOnce({ location: 'granted', coarseLocation: 'granted' })

      const result = await locationService.requestPermission()

      expect(mockRequestPermissions).toHaveBeenCalledOnce()
      expect(result).toBe('granted')
    })

    it('returns "denied" when permission is denied', async () => {
      mockRequestPermissions.mockResolvedValueOnce({ location: 'denied', coarseLocation: 'denied' })

      const result = await locationService.requestPermission()

      expect(result).toBe('denied')
    })
  })

  // ── getCurrentPosition ─────────────────────────────────────────────────────

  describe('getCurrentPosition()', () => {
    it('returns latitude and longitude from Geolocation.getCurrentPosition', async () => {
      mockGetCurrentPosition.mockResolvedValueOnce({
        coords: { latitude: 12.9716, longitude: 77.5946, accuracy: 10, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
        timestamp: Date.now(),
      })

      const coords = await locationService.getCurrentPosition()

      expect(coords).toEqual({ latitude: 12.9716, longitude: 77.5946 })
    })
  })

  // ── startWatching — interval clamping ─────────────────────────────────────

  describe('startWatching() — interval clamping', () => {
    it('passes the provided intervalMs as timeout when it is within the limit', async () => {
      mockWatchPosition.mockResolvedValueOnce('watch-1')

      await locationService.startWatching(vi.fn(), 10_000)

      expect(mockWatchPosition).toHaveBeenCalledWith(
        expect.objectContaining({ timeout: 10_000 }),
        expect.any(Function),
      )
    })

    it('clamps intervalMs to MAX_WATCH_INTERVAL_MS (30 000 ms) when it exceeds the limit', async () => {
      mockWatchPosition.mockResolvedValueOnce('watch-2')

      await locationService.startWatching(vi.fn(), 60_000)

      expect(mockWatchPosition).toHaveBeenCalledWith(
        expect.objectContaining({ timeout: MAX_WATCH_INTERVAL_MS }),
        expect.any(Function),
      )
    })

    it('uses MAX_WATCH_INTERVAL_MS when no intervalMs is provided', async () => {
      mockWatchPosition.mockResolvedValueOnce('watch-3')

      await locationService.startWatching(vi.fn())

      expect(mockWatchPosition).toHaveBeenCalledWith(
        expect.objectContaining({ timeout: MAX_WATCH_INTERVAL_MS }),
        expect.any(Function),
      )
    })

    it('clamps exactly at the boundary (30 000 ms passes through unchanged)', async () => {
      mockWatchPosition.mockResolvedValueOnce('watch-4')

      await locationService.startWatching(vi.fn(), 30_000)

      expect(mockWatchPosition).toHaveBeenCalledWith(
        expect.objectContaining({ timeout: 30_000 }),
        expect.any(Function),
      )
    })
  })

  // ── startWatching — callback and pushLocation ──────────────────────────────

  describe('startWatching() — callback and pushLocation', () => {
    it('invokes the caller callback with coordinates on each position update', async () => {
      const fakePosition = {
        coords: { latitude: 28.6139, longitude: 77.209, accuracy: 5, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
        timestamp: 1_700_000_000_000,
      }

      // Capture the internal callback so we can invoke it manually.
      let internalCallback: ((pos: typeof fakePosition | null, err?: unknown) => void) | null = null
      mockWatchPosition.mockImplementationOnce((_opts: unknown, cb: unknown) => {
        internalCallback = cb as typeof internalCallback
        return Promise.resolve('watch-cb')
      })
      mockPushLocation.mockResolvedValue(undefined)

      const userCallback = vi.fn()
      await locationService.startWatching(userCallback, 5_000)

      // Simulate a position update.
      internalCallback!(fakePosition)

      expect(userCallback).toHaveBeenCalledWith({
        latitude: 28.6139,
        longitude: 77.209,
      })
    })

    it('calls pushLocation with coordinates, accuracy, and office id on each update', async () => {
      const fakePosition = {
        coords: { latitude: 19.076, longitude: 72.8777, accuracy: 8, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
        timestamp: 1_700_000_001_000,
      }

      let internalCallback: ((pos: typeof fakePosition | null, err?: unknown) => void) | null = null
      mockWatchPosition.mockImplementationOnce((_opts: unknown, cb: unknown) => {
        internalCallback = cb as typeof internalCallback
        return Promise.resolve('watch-post')
      })
      mockPushLocation.mockResolvedValue(undefined)
      mockGetOfficeId.mockResolvedValue('office-1')

      await locationService.startWatching(vi.fn(), 5_000)
      internalCallback!(fakePosition)

      // Allow the async pushLocation call to settle.
      await vi.waitFor(() => expect(mockPushLocation).toHaveBeenCalledOnce())

      expect(mockPushLocation).toHaveBeenCalledWith({
        latitude: 19.076,
        longitude: 72.8777,
        accuracy: 8,
        office_id: 'office-1',
      })
    })

    it('does not invoke callback or pushLocation when position is null', async () => {
      let internalCallback: ((pos: null, err?: unknown) => void) | null = null
      mockWatchPosition.mockImplementationOnce((_opts: unknown, cb: unknown) => {
        internalCallback = cb as typeof internalCallback
        return Promise.resolve('watch-null')
      })

      const userCallback = vi.fn()
      await locationService.startWatching(userCallback)
      internalCallback!(null)

      expect(userCallback).not.toHaveBeenCalled()
      expect(mockPushLocation).not.toHaveBeenCalled()
    })

    it('does not crash when pushLocation rejects', async () => {
      const fakePosition = {
        coords: { latitude: 0, longitude: 0, accuracy: 1, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
        timestamp: 0,
      }

      let internalCallback: ((pos: typeof fakePosition | null, err?: unknown) => void) | null = null
      mockWatchPosition.mockImplementationOnce((_opts: unknown, cb: unknown) => {
        internalCallback = cb as typeof internalCallback
        return Promise.resolve('watch-err')
      })
      mockPushLocation.mockRejectedValue(new Error('network error'))

      const userCallback = vi.fn()
      await locationService.startWatching(userCallback)

      // Should not throw.
      await expect(
        (async () => {
          internalCallback!(fakePosition)
          await new Promise((r) => setTimeout(r, 10))
        })(),
      ).resolves.toBeUndefined()

      expect(userCallback).toHaveBeenCalledOnce()
    })

    it('returns the watch ID from Geolocation.watchPosition', async () => {
      mockWatchPosition.mockResolvedValueOnce('my-watch-id')

      const id = await locationService.startWatching(vi.fn())

      expect(id).toBe('my-watch-id')
    })
  })

  // ── stopWatching ───────────────────────────────────────────────────────────

  describe('stopWatching()', () => {
    it('calls Geolocation.clearWatch with the provided watch ID', async () => {
      mockClearWatch.mockResolvedValueOnce(undefined)

      await locationService.stopWatching('watch-xyz')

      expect(mockClearWatch).toHaveBeenCalledWith({ id: 'watch-xyz' })
    })

    it('calls Geolocation.clearWatch exactly once per stopWatching call', async () => {
      mockClearWatch.mockResolvedValue(undefined)

      await locationService.stopWatching('w1')
      await locationService.stopWatching('w2')

      expect(mockClearWatch).toHaveBeenCalledTimes(2)
      expect(mockClearWatch).toHaveBeenNthCalledWith(1, { id: 'w1' })
      expect(mockClearWatch).toHaveBeenNthCalledWith(2, { id: 'w2' })
    })
  })
})
