/**
 * useGoogleMaps
 *
 * Composable that manages a Google Maps instance bound to a DOM element.
 * Handles API loading, map initialization, marker management, and route
 * rendering via the Directions API.
 *
 * Usage:
 *   const { mapRef, isLoaded, initMap, setMarker, drawRoute, clearRoute } = useGoogleMaps()
 *   // Bind mapRef to a <div ref="mapRef"> in the template
 *   // Call initMap() after the element is mounted
 */

import type { Ref } from 'vue'
import { readonly, ref } from 'vue'
import { FEATURES } from '@/shared/lib/feature-flags'
import { loadGoogleMaps } from '@/shared/lib/google-maps'
import type { Coordinates } from '@/shared/models/location.model'

export interface MapMarkerOptions {
  position: Coordinates
  title?: string
  /** Lucide/emoji label shown in a custom marker — falls back to default pin */
  label?: string
  /** Hex color for the marker pin */
  color?: string
  /** Whether to animate the marker (BOUNCE) */
  animate?: boolean
}

export interface UseGoogleMapsReturn {
  /** Bind this ref to the map container <div> */
  mapRef: Ref<HTMLElement | null>
  /** True once the Maps API is loaded and the map is initialized */
  isLoaded: Readonly<Ref<boolean>>
  /** Error message if initialization failed */
  error: Readonly<Ref<string | null>>
  /** The underlying google.maps.Map instance */
  map: Ref<google.maps.Map | null>
  /** Initialize the map on the bound element */
  initMap(options?: google.maps.MapOptions): Promise<void>
  /** Add or update a named marker on the map */
  setMarker(id: string, options: MapMarkerOptions): google.maps.Marker | null
  /** Remove a named marker from the map */
  removeMarker(id: string): void
  /** Pan the map to a coordinate */
  panTo(coords: Coordinates, zoom?: number): void
  /** Draw a driving route between two coordinates using the Directions API */
  drawRoute(origin: Coordinates, destination: Coordinates): Promise<boolean>
  /** Remove the currently rendered route */
  clearRoute(): void
  /** Fit the map bounds to show all provided coordinates */
  fitBounds(coordsList: Coordinates[]): void
}

/** Default map style — clean, minimal */
const DEFAULT_MAP_OPTIONS: google.maps.MapOptions = {
  zoom: 14,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  zoomControl: true,
  gestureHandling: 'greedy',
  styles: [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  ],
}

export function useGoogleMaps(): UseGoogleMapsReturn {
  const mapRef = ref<HTMLElement | null>(null)
  const isLoaded = ref(false)
  const error = ref<string | null>(null)
  const map = ref<google.maps.Map | null>(null)

  const markers = new Map<string, google.maps.Marker>()
  let routePolyline: google.maps.Polyline | null = null

  async function initMap(options?: google.maps.MapOptions): Promise<void> {
    if (!mapRef.value) {
      error.value = 'Map container element is not mounted'
      return
    }

    error.value = null
    try {
      await loadGoogleMaps()

      const mergedOptions: google.maps.MapOptions = {
        ...DEFAULT_MAP_OPTIONS,
        center: { lat: 20.5937, lng: 78.9629 }, // Default: center of India
        ...options,
      }

      map.value = new google.maps.Map(mapRef.value, mergedOptions)
      isLoaded.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to initialize map'
    }
  }

  function setMarker(id: string, options: MapMarkerOptions): google.maps.Marker | null {
    if (!map.value) return null

    const position = { lat: options.position.latitude, lng: options.position.longitude }

    // Update existing marker position if it already exists
    const existing = markers.get(id)
    if (existing) {
      existing.setPosition(position)
      if (options.title) existing.setTitle(options.title)
      return existing
    }

    const markerOptions: google.maps.MarkerOptions = {
      position,
      map: map.value,
      title: options.title,
      animation: options.animate ? google.maps.Animation.BOUNCE : undefined,
    }

    // Custom colored pin using SVG
    if (options.color) {
      markerOptions.icon = {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: options.color,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      }
    }

    const marker = new google.maps.Marker(markerOptions)
    markers.set(id, marker)
    return marker
  }

  function removeMarker(id: string): void {
    const marker = markers.get(id)
    if (marker) {
      marker.setMap(null)
      markers.delete(id)
    }
  }

  function panTo(coords: Coordinates, zoom?: number): void {
    if (!map.value) return
    map.value.panTo({ lat: coords.latitude, lng: coords.longitude })
    if (zoom !== undefined) map.value.setZoom(zoom)
  }

  async function drawRoute(origin: Coordinates, destination: Coordinates): Promise<boolean> {
    if (!map.value) return false
    if (!FEATURES.directions) return false

    try {
      await loadGoogleMaps()

      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
      if (!apiKey) throw new Error('Missing Google Maps API Key')

      const url = `https://routes.googleapis.com/directions/v2:computeRoutes?key=${apiKey}`

      const payload = {
        origin: {
          location: { latLng: { latitude: origin.latitude, longitude: origin.longitude } },
        },
        destination: {
          location: {
            latLng: { latitude: destination.latitude, longitude: destination.longitude },
          },
        },
        travelMode: 'TWO_WHEELER',
        computeAlternativeRoutes: false,
        routeModifiers: {
          avoidTolls: false,
          avoidHighways: false,
          avoidFerries: false,
        },
      }

      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-FieldMask': 'routes.polyline.encodedPath',
        },
        body: JSON.stringify(payload),
      })

      if (!resp.ok) {
        console.error(`Routes API (v2) failed: ${resp.status}`)
        return false
      }

      const data = await resp.json()
      if (!data.routes || data.routes.length === 0) return false

      const encodedPath = data.routes[0].polyline.encodedPath
      if (!encodedPath) return false

      // Use the geometry library to decode the polyline
      const path = google.maps.geometry.encoding.decodePath(encodedPath)

      clearRoute()

      routePolyline = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#7C3AED', // brand purple
        strokeOpacity: 0.85,
        strokeWeight: 5,
        map: map.value,
      })

      return true
    } catch (err) {
      console.error('[useGoogleMaps] Failed to draw route:', err)
      return false
    }
  }

  function clearRoute(): void {
    if (routePolyline) {
      routePolyline.setMap(null)
      routePolyline = null
    }
  }

  function fitBounds(coordsList: Coordinates[]): void {
    if (!map.value || coordsList.length === 0) return

    const bounds = new google.maps.LatLngBounds()
    coordsList.forEach(c => bounds.extend({ lat: c.latitude, lng: c.longitude }))
    map.value.fitBounds(bounds, 60) // 60px padding
  }

  return {
    mapRef,
    isLoaded: readonly(isLoaded),
    error: readonly(error),
    map,
    initMap,
    setMarker,
    removeMarker,
    panTo,
    drawRoute,
    clearRoute,
    fitBounds,
  }
}
