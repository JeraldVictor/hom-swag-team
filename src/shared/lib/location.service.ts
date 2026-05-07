/**
 * Location Service
 *
 * Wraps @capacitor/geolocation to provide GPS acquisition with permission
 * management, position watching (clamped to a 30-second max interval), and
 * automatic BFF API reporting on each position update.
 */

import { Geolocation } from '@capacitor/geolocation'
import type { Coordinates } from '@/shared/models/location.model'
import { pushLocation } from '@/shared/api/location.service'

/** Maximum watch interval in milliseconds (30 seconds). */
export const MAX_WATCH_INTERVAL_MS = 30_000

class LocationService {
  /**
   * Request location permission from the device.
   * Returns the permission status string.
   */
  async requestPermission(): Promise<string> {
    const result = await Geolocation.requestPermissions()
    return result.location
  }

  /**
   * Get the device's current GPS position once.
   */
  async getCurrentPosition(): Promise<Coordinates> {
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
    })
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    }
  }

  /**
   * Start watching the device's GPS position.
   *
   * @param callback  Called on each position update with the new coordinates.
   * @param intervalMs  Desired update interval in ms. Clamped to MAX_WATCH_INTERVAL_MS (30 000 ms).
   * @returns  A watch ID string that can be passed to `stopWatching`.
   */
  async startWatching(
    callback: (coords: Coordinates) => void,
    intervalMs?: number,
  ): Promise<string> {
    // Clamp the interval to the maximum allowed value.
    const clampedInterval =
      intervalMs !== undefined
        ? Math.min(intervalMs, MAX_WATCH_INTERVAL_MS)
        : MAX_WATCH_INTERVAL_MS

    const watchId = await Geolocation.watchPosition(
      {
        enableHighAccuracy: true,
        timeout: clampedInterval,
      },
      async (position, err) => {
        if (err || !position) return

        const coords: Coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }

        // Notify the caller.
        callback(coords)

        // Also POST the location to the BFF API.
        try {
          await pushLocation({
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: position.coords.accuracy ?? undefined,
          })
        } catch {
          // Silently swallow API errors — location tracking must not crash.
        }
      },
    )

    return watchId
  }

  /**
   * Stop a previously started position watch.
   *
   * @param watchId  The ID returned by `startWatching`.
   */
  async stopWatching(watchId: string): Promise<void> {
    await Geolocation.clearWatch({ id: watchId })
  }
}

/** Singleton instance of the Location Service. */
export const locationService = new LocationService()
export default locationService
