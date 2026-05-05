<template>
  <div class="map-wrapper">
    <!-- Maps feature disabled — static fallback -->
    <div v-if="!mapsEnabled" class="map-disabled" role="img" aria-label="Map unavailable">
      <Icon icon="lucide:map-pin-off" class="map-disabled__icon" aria-hidden="true" />
      <p class="map-disabled__text">Map unavailable</p>
    </div>

    <template v-else>
      <!-- Loading state -->
      <div v-if="!isLoaded && !error" class="map-placeholder" aria-label="Loading map">
        <div class="map-placeholder__spinner" />
        <p class="map-placeholder__text">Loading map…</p>
      </div>

      <!-- Error state -->
      <div v-if="error" class="map-error" role="alert">
        <Icon icon="lucide:map-pin-off" class="map-error__icon" aria-hidden="true" />
        <p class="map-error__text">{{ error }}</p>
        <button class="map-error__retry" @click="retry">Retry</button>
      </div>

      <!-- Map container — always rendered so the ref is available -->
      <div
        ref="mapRef"
        class="map-container"
        :class="{ 'map-container--hidden': !isLoaded || !!error }"
        :style="{ height: height }"
        aria-label="Google Map"
        role="application"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useGoogleMaps } from '@/shared/composables/useGoogleMaps'
import { FEATURES } from '@/shared/lib/feature-flags'
import type { Coordinates } from '@/shared/models/location.model'

// ── Feature flag ───────────────────────────────────────────────────────────

const mapsEnabled = FEATURES.maps

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  /** CSS height of the map container (default: '100%') */
  height?: string
  /** Initial center coordinates */
  center?: Coordinates
  /** Initial zoom level (default: 14) */
  zoom?: number
  /** Pickup location marker */
  pickup?: Coordinates | null
  /** Drop location marker */
  drop?: Coordinates | null
  /** Current live position marker (rider/beautician) */
  livePosition?: Coordinates | null
  /** Whether to draw a driving route between pickup and drop */
  showRoute?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  height: '100%',
  zoom: 14,
  pickup: null,
  drop: null,
  livePosition: null,
  showRoute: false,
})

// ── Emits ──────────────────────────────────────────────────────────────────

const emit = defineEmits<{
  (e: 'map-ready', map: google.maps.Map): void
  (e: 'map-error', error: string): void
}>()

// ── Map composable ─────────────────────────────────────────────────────────

const { mapRef, isLoaded, error, map, initMap, setMarker, removeMarker, drawRoute, fitBounds } =
  useGoogleMaps()

// ── Lifecycle ──────────────────────────────────────────────────────────────

onMounted(async () => {
  if (!mapsEnabled) return

  await initMap({
    center: props.center
      ? { lat: props.center.latitude, lng: props.center.longitude }
      : undefined,
    zoom: props.zoom,
  })

  if (isLoaded.value && map.value) {
    emit('map-ready', map.value)
    updateMarkers()
    if (props.showRoute) await updateRoute()
  }

  if (error.value) {
    emit('map-error', error.value)
  }
})

// ── Watchers — react to prop changes ──────────────────────────────────────

watch(() => props.pickup, updateMarkers)
watch(() => props.drop, updateMarkers)
watch(
  () => props.livePosition,
  (pos) => {
    if (pos) {
      setMarker('live', {
        position: pos,
        title: 'Current location',
        color: '#7C3AED',
        animate: false,
      })
    } else {
      removeMarker('live')
    }
  },
)
watch(() => props.showRoute, async (show) => {
  if (show) await updateRoute()
})

// ── Helpers ────────────────────────────────────────────────────────────────

function updateMarkers(): void {
  if (!isLoaded.value) return

  if (props.pickup) {
    setMarker('pickup', {
      position: props.pickup,
      title: 'Pickup',
      color: '#16A34A', // green
    })
  } else {
    removeMarker('pickup')
  }

  if (props.drop) {
    setMarker('drop', {
      position: props.drop,
      title: 'Drop',
      color: '#DC2626', // red
    })
  } else {
    removeMarker('drop')
  }

  // Fit bounds to show all relevant points
  const points: Coordinates[] = []
  if (props.pickup) points.push(props.pickup)
  if (props.drop) points.push(props.drop)
  if (props.livePosition) points.push(props.livePosition)
  if (points.length > 1) fitBounds(points)
}

async function updateRoute(): Promise<void> {
  if (!isLoaded.value || !props.pickup || !props.drop) return
  await drawRoute(props.pickup, props.drop)
}

async function retry(): Promise<void> {
  await initMap({
    center: props.center
      ? { lat: props.center.latitude, lng: props.center.longitude }
      : undefined,
    zoom: props.zoom,
  })
  if (isLoaded.value && map.value) {
    emit('map-ready', map.value)
    updateMarkers()
    if (props.showRoute) await updateRoute()
  }
}
</script>

<style scoped>
.map-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--color-background);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.map-container {
  width: 100%;
  height: 100%;
}

.map-container--hidden {
  visibility: hidden;
  pointer-events: none;
}

/* ── Maps disabled fallback ──────────────────────────────────────────────── */

.map-disabled {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: var(--color-background);
}

.map-disabled__icon {
  font-size: 36px;
  color: var(--color-text-muted);
}

.map-disabled__text {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

/* ── Loading placeholder ─────────────────────────────────────────────────── */

.map-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: var(--color-background);
  z-index: 1;
}

.map-placeholder__spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-brand);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.map-placeholder__text {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

/* ── Error state ─────────────────────────────────────────────────────────── */

.map-error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: var(--color-background);
  padding: 24px;
  z-index: 1;
}

.map-error__icon {
  font-size: 40px;
  color: var(--color-text-muted);
}

.map-error__text {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-align: center;
}

.map-error__retry {
  padding: 8px 20px;
  border: none;
  border-radius: var(--radius-full);
  background: var(--color-brand);
  color: #fff;
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
