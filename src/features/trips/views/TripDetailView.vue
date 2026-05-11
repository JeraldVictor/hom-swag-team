<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/trips" />
        </ion-buttons>
        <ion-title>Trip Details</ion-title>
        <ion-buttons slot="end">
          <!-- Tracking indicator -->
          <div v-if="isTracking" class="tracking-badge" aria-label="Location tracking active">
            <span class="tracking-badge__dot" aria-hidden="true" />
            Live
          </div>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="trip-detail-content">
      <!-- Loading state -->
      <div v-if="isLoading" class="trip-detail-loading">
        <div class="trip-detail-loading__spinner" />
        <p>Loading trip…</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error && !trip" class="trip-detail-error">
        <Icon icon="lucide:alert-circle" class="trip-detail-error__icon" aria-hidden="true" />
        <p>{{ error }}</p>
        <ion-button fill="outline" size="small" @click="fetchTrip(tripId)">Retry</ion-button>
      </div>

      <!-- Trip content -->
      <template v-else-if="trip">
        <!-- ── Map section ──────────────────────────────────────────────── -->
        <div class="map-section">
          <GoogleMapView
            :height="mapHeight"
            :pickup="trip.pickup_location"
            :drop="trip.drop_location"
            :live-position="currentPosition ?? undefined"
            :show-route="showRoute"
            @map-ready="onMapReady"
          />

          <!-- Map controls overlay -->
          <div class="map-controls">
            <button
              v-if="FEATURES.directions"
              class="map-ctrl-btn"
              :class="{ 'map-ctrl-btn--active': showRoute }"
              aria-label="Toggle route"
              @click="showRoute = !showRoute"
            >
              <Icon icon="lucide:route" />
            </button>
            <button
              v-if="currentPosition"
              class="map-ctrl-btn"
              aria-label="Center on my location"
              @click="centerOnMe"
            >
              <Icon icon="lucide:locate" />
            </button>
          </div>
        </div>

        <!-- ── Trip info card ──────────────────────────────────────────── -->
        <div class="trip-info-card">
          <!-- Status + time -->
          <div class="trip-info-card__header">
            <TripStatusBadge :state="trip.kanban_state" />
            <span class="trip-info-card__time">{{ formattedTime }}</span>
          </div>

          <!-- Locations -->
          <div class="trip-locations">
            <!-- Pickup -->
            <div class="trip-location-row">
              <div class="trip-location-row__indicator trip-location-row__indicator--pickup">
                <span class="trip-location-row__dot" aria-hidden="true" />
              </div>
              <div class="trip-location-row__content">
                <span class="trip-location-row__label">Pickup</span>
                <span class="trip-location-row__address">
                  {{ trip.pickup_location.address ?? formatCoords(trip.pickup_location) }}
                </span>
                <span class="trip-location-row__coords">
                  {{ trip.pickup_location.latitude.toFixed(6) }},
                  {{ trip.pickup_location.longitude.toFixed(6) }}
                </span>
              </div>
              <button
                class="trip-location-row__nav-btn"
                aria-label="Navigate to pickup"
                @click="openNativeNav(trip.pickup_location)"
              >
                <Icon icon="lucide:navigation" />
              </button>
            </div>

            <div class="trip-locations__connector" aria-hidden="true" />

            <!-- Drop -->
            <div class="trip-location-row">
              <div class="trip-location-row__indicator trip-location-row__indicator--drop">
                <span class="trip-location-row__dot" aria-hidden="true" />
              </div>
              <div class="trip-location-row__content">
                <span class="trip-location-row__label">Drop</span>
                <span class="trip-location-row__address">
                  {{ trip.drop_location.address ?? formatCoords(trip.drop_location) }}
                </span>
                <span class="trip-location-row__coords">
                  {{ trip.drop_location.latitude.toFixed(6) }},
                  {{ trip.drop_location.longitude.toFixed(6) }}
                </span>
              </div>
              <button
                class="trip-location-row__nav-btn"
                aria-label="Navigate to drop"
                @click="openNativeNav(trip.drop_location)"
              >
                <Icon icon="lucide:navigation" />
              </button>
            </div>
          </div>

          <!-- Fare -->
          <div v-if="trip.fare" class="trip-fare">
            <span class="trip-fare__label">Fare</span>
            <span class="trip-fare__amount">
              <Icon icon="lucide:indian-rupee" aria-hidden="true" />
              {{ trip.fare.toFixed(2) }}
            </span>
          </div>

          <!-- Notes -->
          <div v-if="trip.notes" class="trip-notes">
            <Icon icon="lucide:file-text" class="trip-notes__icon" aria-hidden="true" />
            <p class="trip-notes__text">{{ trip.notes }}</p>
          </div>
        </div>

        <!-- ── Location override section ──────────────────────────────── -->
        <div class="location-override-card">
          <button
            class="location-override-card__toggle"
            :aria-expanded="showLocationOverride"
            @click="showLocationOverride = !showLocationOverride"
          >
            <Icon icon="lucide:map-pin" aria-hidden="true" />
            <span>Override Locations</span>
            <Icon
              :icon="showLocationOverride ? 'lucide:chevron-up' : 'lucide:chevron-down'"
              class="location-override-card__chevron"
              aria-hidden="true"
            />
          </button>

          <Transition name="expand">
            <div v-if="showLocationOverride" class="location-override-card__body">
              <p class="location-override-card__hint">
                Search by address or enter coordinates as <code>lat, lng</code>
              </p>

              <div class="location-override-card__field">
                <label class="location-override-card__label">Pickup location</label>
                <PlacesSearchInput
                  v-model="pickupQuery"
                  label="Pickup location"
                  placeholder="Search or enter lat, lng"
                  icon="lucide:circle-dot"
                  @place-selected="onPickupSelected"
                />
              </div>

              <div class="location-override-card__field">
                <label class="location-override-card__label">Drop location</label>
                <PlacesSearchInput
                  v-model="dropQuery"
                  label="Drop location"
                  placeholder="Search or enter lat, lng"
                  icon="lucide:map-pin"
                  @place-selected="onDropSelected"
                />
              </div>

              <ion-button
                expand="block"
                fill="outline"
                size="small"
                class="location-override-card__apply"
                :disabled="!overridePickup && !overrideDrop"
                @click="applyOverrides"
              >
                Apply to map
              </ion-button>
            </div>
          </Transition>
        </div>

        <!-- ── Action button ───────────────────────────────────────────── -->
        <div class="trip-action-section">
          <!-- Tracking toggle (only when trip is in progress) -->
          <div v-if="isInProgress" class="tracking-toggle">
            <div class="tracking-toggle__info">
              <span class="tracking-toggle__title">
                {{ isTracking ? 'Tracking active' : 'Tracking paused' }}
              </span>
              <span class="tracking-toggle__sub">
                {{ isTracking ? 'Your location is being shared' : 'Admin cannot see your location' }}
              </span>
            </div>
            <button
              class="tracking-toggle__btn"
              :class="{ 'tracking-toggle__btn--active': isTracking }"
              :aria-label="isTracking ? 'Stop tracking' : 'Start tracking'"
              @click="toggleTracking"
            >
              <Icon :icon="isTracking ? 'lucide:pause' : 'lucide:play'" />
            </button>
          </div>

          <!-- Advance status button -->
          <ion-button
            v-if="nextActionLabel"
            expand="block"
            :disabled="isUpdating"
            class="trip-action-btn"
            @click="handleAdvance"
          >
            <ion-spinner v-if="isUpdating" name="crescent" slot="start" />
            {{ nextActionLabel }}
          </ion-button>

          <!-- Navigate full route button -->
          <ion-button
            expand="block"
            fill="outline"
            class="trip-action-btn"
            @click="openFullRouteNav"
          >
            <Icon icon="lucide:navigation-2" slot="start" aria-hidden="true" />
            Open in Maps
          </ion-button>
        </div>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useToast, useTracking } from '@/shared/composables'
import { useNavigation } from '@/shared/composables/useNavigation'
import { formatISTTime } from '@/shared/lib/datetime'
import { FEATURES } from '@/shared/lib/feature-flags'
import type { Coordinates, PlaceResult } from '@/shared/models/location.model'
import type { TripKanbanState } from '@/shared/models/trip.model'
import { useTripDetail } from '../composables/useTripDetail'

// ── Route param ────────────────────────────────────────────────────────────

const route = useRoute()
const tripId = computed(() => route.params.id as string)

// ── Composables ────────────────────────────────────────────────────────────

const { trip, isLoading, error, isUpdating, isInProgress, fetchTrip, advanceStatus } =
  useTripDetail()

const { currentPosition, isTracking, startTracking, stopTracking } = useTracking()
const { showSuccess, showError } = useToast()
const { openNavigationMenu } = useNavigation()

// ── Local state ────────────────────────────────────────────────────────────

const showRoute = ref(FEATURES.directions)
const showLocationOverride = ref(false)
const pickupQuery = ref('')
const dropQuery = ref('')
const overridePickup = ref<PlaceResult | null>(null)
const overrideDrop = ref<PlaceResult | null>(null)
const mapInstance = ref<google.maps.Map | null>(null)

const effectiveDrop = computed<Coordinates | null>(() => {
  if (overrideDrop.value) return overrideDrop.value.coordinates
  return trip.value?.drop_location ?? null
})

// ── Map height — 40% of viewport ──────────────────────────────────────────

const mapHeight = '40vh'

// ── Computed ───────────────────────────────────────────────────────────────

const formattedTime = computed(() => (trip.value ? formatISTTime(trip.value.start_time) : ''))

const NEXT_ACTION_LABELS: Partial<Record<TripKanbanState, string>> = {
  Assigned: 'Mark as Viewed',
  Viewed: 'Start Trip',
  'Trip Started': 'Complete Trip',
  'Trip Completed': 'Calculate Fare',
  'Fare Calculated': 'Mark Completed',
}

const nextActionLabel = computed(() =>
  trip.value ? (NEXT_ACTION_LABELS[trip.value.kanban_state] ?? null) : null
)

// ── Lifecycle ──────────────────────────────────────────────────────────────

onMounted(async () => {
  await fetchTrip(tripId.value)
})

// Auto-start tracking when trip enters "Trip Started" state
watch(
  () => trip.value?.kanban_state,
  async state => {
    if (state === 'Trip Started' && !isTracking.value) {
      await startTracking()
    }
    if ((state === 'Trip Completed' || state === 'Completed') && isTracking.value) {
      await stopTracking()
    }
  }
)

onUnmounted(() => {
  stopTracking()
})

// ── Handlers ───────────────────────────────────────────────────────────────

function onMapReady(map: google.maps.Map): void {
  mapInstance.value = map
}

function centerOnMe(): void {
  if (!mapInstance.value || !currentPosition.value) return
  mapInstance.value.panTo({
    lat: currentPosition.value.latitude,
    lng: currentPosition.value.longitude,
  })
  mapInstance.value.setZoom(16)
}

async function toggleTracking(): Promise<void> {
  if (isTracking.value) {
    await stopTracking()
    showSuccess('Location tracking paused')
  } else {
    await startTracking()
    showSuccess('Location tracking started')
  }
}

async function handleAdvance(): Promise<void> {
  await advanceStatus()
  if (!error.value) {
    showSuccess(`Status updated to: ${trip.value?.kanban_state}`)
  } else {
    showError(error.value)
  }
}

async function openNativeNav(coords: Coordinates): Promise<void> {
  const { latitude: lat, longitude: lng } = coords
  await openNavigationMenu(lat, lng, 'Destination')
}

async function openFullRouteNav(): Promise<void> {
  if (!effectiveDrop.value) return
  const { latitude: dLat, longitude: dLng } = effectiveDrop.value
  await openNavigationMenu(dLat, dLng, 'Destination')
}

function onPickupSelected(place: PlaceResult): void {
  overridePickup.value = place
}

function onDropSelected(place: PlaceResult): void {
  overrideDrop.value = place
}

function applyOverrides(): void {
  // Overrides are reactive — GoogleMapView will update automatically
  showLocationOverride.value = false
  showSuccess('Map updated with new locations')
}

function formatCoords(coords: Coordinates): string {
  return `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
}
</script>

<style scoped>
/* ── Content ─────────────────────────────────────────────────────────────── */

.trip-detail-content {
  --padding-bottom: 32px;
}

/* ── Loading / error ─────────────────────────────────────────────────────── */

.trip-detail-loading,
.trip-detail-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 64px 32px;
  text-align: center;
  color: var(--color-text-muted);
}

.trip-detail-loading__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-brand);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.trip-detail-error__icon {
  font-size: 48px;
  color: var(--color-error);
}

/* ── Tracking badge (header) ─────────────────────────────────────────────── */

.tracking-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: var(--color-success-bg);
  color: var(--color-success-text);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 700;
  margin-right: 8px;
}

.tracking-badge__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-success);
  animation: pulse 1.5s ease-in-out infinite;
}

/* ── Map section ─────────────────────────────────────────────────────────── */

.map-section {
  position: relative;
  width: 100%;
  height: 40vh;
  min-height: 220px;
}

.map-controls {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 10;
}

.map-ctrl-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.map-ctrl-btn--active {
  background: var(--color-brand);
  color: #fff;
  border-color: var(--color-brand);
}

/* ── Trip info card ──────────────────────────────────────────────────────── */

.trip-info-card {
  margin: 12px 16px 0;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 16px;
}

.trip-info-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.trip-info-card__time {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

/* ── Locations ───────────────────────────────────────────────────────────── */

.trip-locations {
  display: flex;
  flex-direction: column;
  margin-bottom: 14px;
}

.trip-locations__connector {
  width: 2px;
  height: 20px;
  background: var(--color-border);
  margin-left: 11px;
}

.trip-location-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.trip-location-row__indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  flex-shrink: 0;
  padding-top: 2px;
}

.trip-location-row__dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1.5px currentColor;
  display: block;
}

.trip-location-row__indicator--pickup .trip-location-row__dot {
  background: var(--color-success);
  color: var(--color-success);
}

.trip-location-row__indicator--drop .trip-location-row__dot {
  background: var(--color-error);
  color: var(--color-error);
}

.trip-location-row__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.trip-location-row__label {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.trip-location-row__address {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trip-location-row__coords {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  font-family: monospace;
}

.trip-location-row__nav-btn {
  background: var(--color-brand-pale);
  border: none;
  border-radius: var(--radius-full);
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--color-brand);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ease;
}

.trip-location-row__nav-btn:active {
  background: var(--color-brand-light);
}

/* ── Fare ────────────────────────────────────────────────────────────────── */

.trip-fare {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
  margin-top: 4px;
}

.trip-fare__label {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  font-weight: 500;
}

.trip-fare__amount {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: var(--font-size-xl);
  font-weight: 800;
  color: var(--color-text);
}

/* ── Notes ───────────────────────────────────────────────────────────────── */

.trip-notes {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 12px;
  background: var(--color-info-bg);
  border-radius: var(--radius-md);
}

.trip-notes__icon {
  font-size: 16px;
  color: var(--color-info-text);
  flex-shrink: 0;
  margin-top: 1px;
}

.trip-notes__text {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-info-text);
  line-height: 1.5;
}

/* ── Location override card ──────────────────────────────────────────────── */

.location-override-card {
  margin: 12px 16px 0;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.location-override-card__toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 14px 16px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
  text-align: left;
  -webkit-tap-highlight-color: transparent;
}

.location-override-card__chevron {
  margin-left: auto;
  font-size: 18px;
  color: var(--color-text-muted);
}

.location-override-card__body {
  padding: 0 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-top: 1px solid var(--color-border);
}

.location-override-card__hint {
  margin: 12px 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.location-override-card__hint code {
  background: var(--color-background);
  padding: 1px 5px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
}

.location-override-card__label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.location-override-card__field {
  display: flex;
  flex-direction: column;
}

.location-override-card__apply {
  margin-top: 4px;
}

/* ── Action section ──────────────────────────────────────────────────────── */

.trip-action-section {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ── Tracking toggle ─────────────────────────────────────────────────────── */

.tracking-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 14px 16px;
}

.tracking-toggle__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tracking-toggle__title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
}

.tracking-toggle__sub {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.tracking-toggle__btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: var(--color-brand-pale);
  color: var(--color-brand);
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease;
  flex-shrink: 0;
}

.tracking-toggle__btn--active {
  background: var(--color-brand);
  color: #fff;
}

.trip-action-btn {
  --border-radius: var(--radius-xl);
}

/* ── Expand transition ───────────────────────────────────────────────────── */

.expand-enter-active,
.expand-leave-active {
  transition: max-height 0.25s ease, opacity 0.2s ease;
  overflow: hidden;
  max-height: 400px;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}

/* ── Animations ──────────────────────────────────────────────────────────── */

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}
</style>
