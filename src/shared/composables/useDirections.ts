/**
 * useDirections
 *
 * Provides `openDirections(lat, lng, label?)` which deep-links to the native
 * map application:
 *   - iOS  → Apple Maps  (maps://  URI)
 *   - Android / Web → Google Maps  (https://maps.google.com URI)
 *
 * Platform detection uses `navigator.platform` and the user-agent string,
 * which is the standard approach for Capacitor web-view environments.
 */

/**
 * Detect whether the current platform is iOS.
 * Checks both `navigator.platform` (older) and the user-agent (modern iOS).
 */
function isIOS(): boolean {
  const platform = navigator.platform ?? ''
  const ua = navigator.userAgent ?? ''
  return (
    /iPad|iPhone|iPod/.test(platform) ||
    // iPadOS 13+ reports "MacIntel" but has touch support
    (/Mac/.test(platform) && navigator.maxTouchPoints > 1) ||
    /iPad|iPhone|iPod/.test(ua)
  )
}

/**
 * Open the native map application with directions to the given coordinates.
 *
 * @param lat   - Destination latitude
 * @param lng   - Destination longitude
 * @param label - Optional human-readable label for the destination pin
 */
function openDirections(lat: number, lng: number, label?: string): void {
  let url: string

  if (isIOS()) {
    // Apple Maps deep-link
    const destination = label
      ? encodeURIComponent(label)
      : `${lat},${lng}`
    url = `maps://?daddr=${destination}&dirflg=d`
  } else {
    // Google Maps universal URL (works on Android, web, and as a fallback)
    const destination = label
      ? encodeURIComponent(label)
      : `${lat},${lng}`
    url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`
  }

  window.open(url, '_system')
}

export function useDirections() {
  return {
    openDirections,
  }
}
