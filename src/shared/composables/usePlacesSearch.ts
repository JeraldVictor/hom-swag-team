/**
 * usePlacesSearch
 *
 * Composable that wraps the Google Places Autocomplete service to provide
 * address search with debouncing and coordinate resolution.
 *
 * Supports both:
 *   - Text-based search (Places Autocomplete → Geocoder for coordinates)
 *   - Direct lat/lng input (parsed and returned as-is)
 */

import type { Ref } from 'vue'
import { readonly, ref } from 'vue'
import { loadGoogleMaps } from '@/shared/lib/google-maps'
import type { PlaceResult } from '@/shared/models/location.model'

export interface UsePlacesSearchReturn {
  /** Current search query string */
  query: Ref<string>
  /** Autocomplete suggestions */
  suggestions: Ref<google.maps.places.AutocompletePrediction[]>
  /** True while fetching suggestions or resolving a place */
  isLoading: Readonly<Ref<boolean>>
  /** Error message, or null */
  error: Readonly<Ref<string | null>>
  /** Fetch autocomplete suggestions for the current query */
  fetchSuggestions(): Promise<void>
  /** Resolve a prediction to a full PlaceResult with coordinates */
  selectPrediction(
    prediction: google.maps.places.AutocompletePrediction
  ): Promise<PlaceResult | null>
  /** Parse a "lat,lng" string and return a PlaceResult */
  parseLatLng(input: string): PlaceResult | null
  /** Clear suggestions */
  clearSuggestions(): void
}

/** Debounce delay for autocomplete requests (ms) */
const DEBOUNCE_MS = 350

export function usePlacesSearch(): UsePlacesSearchReturn {
  const query = ref('')
  const suggestions = ref<google.maps.places.AutocompletePrediction[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  let autocompleteService: google.maps.places.AutocompleteService | null = null
  let geocoder: google.maps.Geocoder | null = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  async function ensureServices(): Promise<void> {
    await loadGoogleMaps()
    if (!autocompleteService) {
      autocompleteService = new google.maps.places.AutocompleteService()
    }
    if (!geocoder) {
      geocoder = new google.maps.Geocoder()
    }
  }

  async function fetchSuggestions(): Promise<void> {
    const q = query.value.trim()

    // If it looks like a lat,lng pair, skip autocomplete
    if (/^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/.test(q)) {
      suggestions.value = []
      return
    }

    if (q.length < 3) {
      suggestions.value = []
      return
    }

    // Debounce
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(async () => {
      isLoading.value = true
      error.value = null
      try {
        await ensureServices()
        const response = await autocompleteService?.getPlacePredictions({
          input: q,
          types: ['geocode', 'establishment'],
          componentRestrictions: { country: 'in' },
        })
        suggestions.value = response?.predictions || []
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to fetch suggestions'
        suggestions.value = []
      } finally {
        isLoading.value = false
      }
    }, DEBOUNCE_MS)
  }

  async function selectPrediction(
    prediction: google.maps.places.AutocompletePrediction
  ): Promise<PlaceResult | null> {
    isLoading.value = true
    error.value = null
    try {
      await ensureServices()

      const result = await geocoder?.geocode({ placeId: prediction.place_id })
      const location = result?.results[0]?.geometry?.location

      if (!location) {
        error.value = 'Could not resolve coordinates for this place'
        return null
      }

      return {
        placeId: prediction.place_id,
        address: prediction.description,
        coordinates: {
          latitude: location.lat(),
          longitude: location.lng(),
        },
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to resolve place'
      return null
    } finally {
      isLoading.value = false
      suggestions.value = []
    }
  }

  /**
   * Parse a "lat,lng" string into a PlaceResult.
   * Returns null if the string is not a valid coordinate pair.
   */
  function parseLatLng(input: string): PlaceResult | null {
    const trimmed = input.trim()
    const match = trimmed.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/)
    if (!match) return null

    const latitude = parseFloat(match[1])
    const longitude = parseFloat(match[2])

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null
    if (latitude < -90 || latitude > 90) return null
    if (longitude < -180 || longitude > 180) return null

    return {
      placeId: `latlng:${latitude},${longitude}`,
      address: `${latitude}, ${longitude}`,
      coordinates: { latitude, longitude },
    }
  }

  function clearSuggestions(): void {
    suggestions.value = []
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }

  return {
    query,
    suggestions,
    isLoading: readonly(isLoading),
    error: readonly(error),
    fetchSuggestions,
    selectPrediction,
    parseLatLng,
    clearSuggestions,
  }
}
