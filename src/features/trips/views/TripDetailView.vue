<template>
  <ion-page>
    <ion-header class="ion-no-border modern-header">
      <ion-toolbar color="transparent">
        <ion-buttons slot="start">
          <ion-back-button default-href="/trips" class="back-btn" />
        </ion-buttons>
        <ion-title class="header-title">Trip Details</ion-title>
        <ion-buttons slot="end">
          <div v-if="isTracking" class="live-tracking-pill" aria-label="Location tracking active">
            <span class="pulse-dot" aria-hidden="true" />
            Live
          </div>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="modern-content">
      <div v-if="isLoading" class="loading-state">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
        <p>Loading trip details...</p>
      </div>

      <div v-else-if="error && !trip" class="error-state">
        <Icon icon="lucide:alert-octagon" class="error-icon" />
        <p>{{ error }}</p>
        <button class="btn-retry" @click="fetchTrip(tripId)">Retry</button>
      </div>

      <template v-else-if="trip">
        <!-- Map View -->
        <div class="map-container">
          <GoogleMapView
            :height="mapHeight"
            :pickup="trip.pickup_location"
            :drop="trip.drop_location"
            :live-position="currentPosition ?? undefined"
            :show-route="showRoute"
            @map-ready="onMapReady"
          />
          <div class="map-actions">
            <button v-if="FEATURES.directions" class="map-fab" :class="{ 'map-fab--active': showRoute }" @click="showRoute = !showRoute">
              <Icon icon="lucide:route" />
            </button>
            <button v-if="currentPosition" class="map-fab" @click="centerOnMe">
              <Icon icon="lucide:crosshair" />
            </button>
          </div>
        </div>

        <div class="details-container">
          <!-- Main Info Header -->
          <div class="card header-card">
            <div class="header-card__top">
              <div>
                <h1 class="trip-number">{{ trip.trip_number || 'T-XXXX' }}</h1>
                <p class="trip-time">{{ formattedTime }}</p>
              </div>
              <AppBadge :text="formattedStatus" :variant="statusVariant" size="md" />
            </div>
            
            <div class="trip-stats-grid">
              <div class="stat-box">
                <Icon icon="lucide:ruler" class="stat-icon" />
                <div class="stat-text">
                  <span class="stat-value">{{ formattedTotalDistance }}</span>
                  <span class="stat-label">Distance</span>
                </div>
              </div>
              <div class="stat-box">
                <Icon icon="lucide:arrow-right-left" class="stat-icon text-blue" v-if="trip.is_two_way" />
                <Icon icon="lucide:arrow-right" class="stat-icon text-gray" v-else />
                <div class="stat-text">
                  <span class="stat-value">{{ trip.is_two_way ? 'Round Trip' : 'One Way' }}</span>
                  <span class="stat-label">Type</span>
                </div>
              </div>
              <div class="stat-box">
                <Icon icon="lucide:indian-rupee" class="stat-icon text-green" />
                <div class="stat-text">
                  <span class="stat-value">{{ formattedRiderFare }}</span>
                  <span class="stat-label">{{ trip.is_commission_applicable ? 'Commission' : 'Fare' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Beautician Details -->
          <div v-if="trip.beautician_name" class="card beautician-card">
            <div class="beautician-profile">
              <div class="beautician-avatar">
                <Icon icon="lucide:user" />
              </div>
              <div class="beautician-info">
                <h3 class="b-name">{{ trip.beautician_name }}</h3>
                <p class="b-role">Assigned Beautician</p>
              </div>
            </div>
            <a v-if="trip.beautician_phone" :href="`tel:${trip.beautician_phone}`" class="call-btn">
              <Icon icon="lucide:phone-call" />
            </a>
          </div>

          <!-- Routing Details -->
          <div class="card route-card">
            <h2 class="card-title"><Icon icon="lucide:map" /> Navigation Route</h2>
            
            <div class="route-timeline">
              <!-- Pickup -->
              <div class="route-point">
                <div class="route-indicator">
                  <div class="indicator-dot pickup" />
                  <div class="indicator-line" />
                </div>
                <div class="route-content">
                  <p class="r-label">Pickup</p>
                  <p class="r-address">{{ formatLocationAddress(trip.pickup_location) }}</p>
                  <p class="r-coords">Lat, Lng: {{ formatCoords(trip.pickup_location) }}</p>
                  <p v-if="trip.pickup_note" class="route-note">{{ trip.pickup_note }}</p>
                </div>
                <button
                  type="button"
                  class="nav-icon-btn"
                  aria-label="Navigate Pickup"
                  :disabled="!hasCoordinates(trip.pickup_location)"
                  :aria-disabled="!hasCoordinates(trip.pickup_location)"
                  @click.stop.prevent="openNativeNav(trip.pickup_location)">
                  <Icon icon="lucide:navigation" />
                </button>
              </div>

              <!-- Drop -->
              <div class="route-point">
                <div class="route-indicator">
                  <div class="indicator-dot drop" />
                </div>
                <div class="route-content">
                  <p class="r-label">Drop</p>
                  <p class="r-address">{{ formatLocationAddress(trip.drop_location) }}</p>
                  <p class="r-coords">Lat, Lng: {{ formatCoords(trip.drop_location) }}</p>
                  <p v-if="trip.drop_note" class="route-note">{{ trip.drop_note }}</p>
                </div>
                <button
                  type="button"
                  class="nav-icon-btn"
                  aria-label="Navigate Drop"
                  :disabled="!hasCoordinates(trip.drop_location)"
                  :aria-disabled="!hasCoordinates(trip.drop_location)"
                  @click.stop.prevent="openNativeNav(trip.drop_location)">
                  <Icon icon="lucide:navigation" />
                </button>
              </div>
            </div>

            <button class="btn-full-route" :disabled="!hasCoordinates(effectiveDrop)" @click.stop.prevent="openFullRouteNav">
              <Icon icon="lucide:map-pin" /> View Full Route in Maps
            </button>
          </div>

          <!-- Extra Meta Data -->
          <div class="card extra-card">
            <div class="extra-row" v-if="trip.order_number">
              <span class="extra-label">Order Number</span>
              <span class="extra-value">#{{ trip.order_number }}</span>
            </div>
            <div class="extra-row" v-if="trip.customer_name">
              <span class="extra-label">Customer</span>
              <span class="extra-value">{{ trip.customer_name }}</span>
            </div>
            <div class="extra-row" v-else>
              <span class="extra-label">Customer</span>
              <span class="extra-value extra-value--muted">Customer info unavailable</span>
            </div>
            <div class="extra-row" v-if="trip.beautician_name">
              <span class="extra-label">Beautician</span>
              <span class="extra-value">{{ trip.beautician_name }}</span>
            </div>
            <div class="extra-row" v-if="trip.beautician_phone">
              <span class="extra-label">Beautician Phone</span>
              <a class="extra-value extra-value--link" :href="`tel:${trip.beautician_phone}`">
                {{ trip.beautician_phone }}
              </a>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="hasTripNotes" class="notes-box">
            <Icon icon="lucide:file-text" class="notes-icon" />
            <div class="notes-content">
              <div v-if="trip.notes" class="note-row">
                <span>Note</span>
                <p>{{ trip.notes }}</p>
              </div>
              <div v-if="trip.pickup_note" class="note-row">
                <span>Pickup note</span>
                <p>{{ trip.pickup_note }}</p>
              </div>
              <div v-if="trip.drop_note" class="note-row">
                <span>Drop note</span>
                <p>{{ trip.drop_note }}</p>
              </div>
              <div v-if="trip.attention_note" class="note-row note-row--attention">
                <span>Concern note</span>
                <p>{{ trip.attention_note }}</p>
              </div>
            </div>
          </div>
          <div class="bottom-spacer" />
        </div>
      </template>
    </ion-content>

    <ion-modal
      :is-open="isConcernModalOpen"
      :initial-breakpoint="0.46"
      :breakpoints="[0, 0.46, 0.78]"
      handle-behavior="cycle"
      class="concern-modal"
      @didDismiss="isConcernModalOpen = false"
    >
      <ion-header class="ion-no-border concern-modal__header">
        <ion-toolbar>
          <ion-title>Raise Concern</ion-title>
          <ion-buttons slot="end">
            <ion-button :disabled="isUpdating" @click="closeConcernModal">Cancel</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="concern-modal__content">
        <div class="concern-form">
          <p class="concern-form__hint">Share what needs review. This note is optional.</p>
          <ion-textarea
            v-model="concernNote"
            class="concern-textarea"
            label="Concern note"
            label-placement="stacked"
            placeholder="Optional note for staff or admin..."
            :auto-grow="true"
            :counter="true"
            :maxlength="1000"
            :disabled="isUpdating"
          />
          <ion-button
            expand="block"
            class="concern-submit"
            :disabled="isUpdating"
            @click="submitConcern"
          >
            <ion-spinner v-if="isUpdating" name="crescent" class="btn-spinner" />
            Request Review
          </ion-button>
        </div>
      </ion-content>
    </ion-modal>

    <!-- Action Footer -->
    <ion-footer v-if="trip" class="modern-footer ion-no-border">
      <div class="footer-content">
        <!-- Tracking Toggle -->
        <div v-if="isInProgress" class="tracking-banner">
          <div class="tracking-info">
            <span class="tracking-title">{{ isTracking ? 'Live Tracking Active' : 'Tracking Paused' }}</span>
            <span class="tracking-sub">{{ isTracking ? 'Location sharing is ON' : 'Location sharing is OFF' }}</span>
          </div>
          <button class="tracking-toggle-btn" :class="{ 'tracking-toggle-btn--active': isTracking }" @click="toggleTracking">
            <Icon :icon="isTracking ? 'lucide:pause' : 'lucide:play'" />
          </button>
        </div>

        <!-- Main Advance Button -->
        <button 
          v-if="nextActionLabel" 
          class="btn-primary-action" 
          :disabled="isUpdating" 
          @click="handleAdvance"
        >
          <ion-spinner v-if="isUpdating" name="crescent" class="btn-spinner" />
          {{ nextActionLabel }}
        </button>
        <button
          v-if="canRaiseConcern"
          class="btn-secondary-action"
          :disabled="isUpdating"
          @click="openConcernModal"
        >
          <ion-spinner v-if="isUpdating" name="crescent" class="btn-spinner" />
          Raise Concern
        </button>
      </div>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { alertController, onIonViewWillEnter } from '@ionic/vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppBadge from '@/shared/components/ui/AppBadge.vue'
import GoogleMapView from '@/shared/components/ui/GoogleMapView.vue'
import PlacesSearchInput from '@/shared/components/ui/PlacesSearchInput.vue'
import { useToast, useTracking } from '@/shared/composables'
import { useNavigation } from '@/shared/composables/useNavigation'
import { formatISTTime } from '@/shared/lib/datetime'
import { FEATURES } from '@/shared/lib/feature-flags'
import type { Coordinates, PlaceResult } from '@/shared/models/location.model'
import type { TripStatus } from '@/shared/models/trip.model'
import { TRIP_STATUS } from '@/shared/models/trip.model'
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
const isConcernModalOpen = ref(false)
const concernNote = ref('')

const effectiveDrop = computed<Coordinates | null>(() => {
  if (overrideDrop.value) return overrideDrop.value.coordinates
  return trip.value?.drop_location ?? null
})

// ── Map height — 40% of viewport ──────────────────────────────────────────

const mapHeight = '40vh'

// ── Computed ───────────────────────────────────────────────────────────────

const formattedStatus = computed(() => {
  const s = trip.value?.status
  if (s === TRIP_STATUS.ASSIGNED || s === TRIP_STATUS.SCHEDULED) return 'Assigned'
  if (s === TRIP_STATUS.STARTED || s === TRIP_STATUS.IN_PROGRESS) return 'Started'
  if (s === TRIP_STATUS.DROPPED_AND_WAITING) return 'Waiting'
  if (s === TRIP_STATUS.ATTENTION_NEEDED) return 'Attention Needed'
  if (s === TRIP_STATUS.COMPLETED) return 'Completed'
  if (s === TRIP_STATUS.CANCELLED) return 'Cancelled'
  return 'Pending'
})

const statusVariant = computed(() => {
  const s = trip.value?.status
  if (s === TRIP_STATUS.COMPLETED) return 'success'
  if (
    s === TRIP_STATUS.STARTED ||
    s === TRIP_STATUS.IN_PROGRESS ||
    s === TRIP_STATUS.DROPPED_AND_WAITING
  )
    return 'brand'
  if (s === TRIP_STATUS.ATTENTION_NEEDED) return 'warning'
  if (s === TRIP_STATUS.CANCELLED) return 'danger'
  return 'warning'
})

const formattedTime = computed(() => (trip.value ? formatISTTime(trip.value.start_time) : ''))

const formattedRiderFare = computed(() => {
  if (!trip.value?.fare && trip.value?.fare !== 0) return '—'
  return `₹${trip.value.fare.toFixed(2)}`
})

const totalDistanceKm = computed(() => {
  const autoKm = trip.value?.auto_distance_km
  if (autoKm == null) return null
  const multiplier = trip.value?.is_two_way ? 2 : 1
  return autoKm * multiplier + (trip.value?.extra_km ?? 0)
})

const formattedTotalDistance = computed(() => {
  if (totalDistanceKm.value == null) return '—'
  return `${Number(totalDistanceKm.value.toFixed(2))} km`
})

const hasTripNotes = computed(() =>
  Boolean(
    trip.value?.notes ||
      trip.value?.pickup_note ||
      trip.value?.drop_note ||
      trip.value?.attention_note
  )
)

const canRaiseConcern = computed(() => trip.value?.status === TRIP_STATUS.COMPLETED)

const nextActionLabel = computed(() => {
  if (!trip.value) return null
  const status = trip.value.status
  if (status === TRIP_STATUS.ASSIGNED || status === TRIP_STATUS.SCHEDULED) return 'Start Trip'
  if (status === TRIP_STATUS.STARTED || status === TRIP_STATUS.IN_PROGRESS)
    return trip.value.is_two_way ? 'Drop & Wait' : 'Complete Trip'
  if (status === TRIP_STATUS.DROPPED_AND_WAITING) return 'Complete Trip'
  return null
})

// ── Lifecycle ──────────────────────────────────────────────────────────────

onMounted(() => {
  // Mount logic if needed
})

onIonViewWillEnter(async () => {
  await fetchTrip(tripId.value)
})

// Auto-start tracking when trip enters the started status
watch(
  () => trip.value?.status,
  async status => {
    if (
      (status === TRIP_STATUS.STARTED || status === TRIP_STATUS.IN_PROGRESS) &&
      !isTracking.value
    ) {
      await startTracking()
    }
    if (
      (status === TRIP_STATUS.COMPLETED || status === TRIP_STATUS.CANCELLED) &&
      isTracking.value
    ) {
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
  const isOneWayCompleting =
    (trip.value?.status === TRIP_STATUS.STARTED ||
      trip.value?.status === TRIP_STATUS.IN_PROGRESS) &&
    !trip.value?.is_two_way
  const isTwoWayCompleting = trip.value?.status === TRIP_STATUS.DROPPED_AND_WAITING

  if (isOneWayCompleting || isTwoWayCompleting) {
    const calculatedKm =
      totalDistanceKm.value != null ? `${Number(totalDistanceKm.value.toFixed(2))} km` : '—'
    const alert = await alertController.create({
      header: 'Complete Trip',
      message: `Are you sure you want to complete this trip? (Distance: ${calculatedKm})`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Complete',
          handler: async () => {
            await advanceStatus(TRIP_STATUS.COMPLETED)
            if (!error.value) {
              showSuccess('Trip marked as completed!')
            } else {
              showError(error.value)
            }
          },
        },
      ],
    })
    await alert.present()
    return
  }

  let overrideStatus: TripStatus | undefined
  if (
    (trip.value?.status === TRIP_STATUS.STARTED ||
      trip.value?.status === TRIP_STATUS.IN_PROGRESS) &&
    trip.value?.is_two_way
  ) {
    overrideStatus = TRIP_STATUS.DROPPED_AND_WAITING
  }

  await advanceStatus(overrideStatus)
  if (!error.value) {
    showSuccess(`Status updated to: ${formattedStatus.value}`)
  } else {
    showError(error.value)
  }
}

function openConcernModal(): void {
  if (!trip.value || !canRaiseConcern.value) return
  concernNote.value = trip.value.attention_note ?? ''
  isConcernModalOpen.value = true
}

function closeConcernModal(): void {
  if (isUpdating.value) return
  isConcernModalOpen.value = false
}

async function submitConcern(): Promise<void> {
  if (!trip.value || !canRaiseConcern.value) return

  await advanceStatus(TRIP_STATUS.ATTENTION_NEEDED, undefined, concernNote.value.trim())
  if (!error.value) {
    isConcernModalOpen.value = false
    showSuccess('Concern sent for review')
  } else {
    showError(error.value)
  }
}

function hasCoordinates(coords?: Coordinates | null): coords is Coordinates {
  return !!coords && Number.isFinite(coords.latitude) && Number.isFinite(coords.longitude)
}

async function openNativeNav(coords?: Coordinates): Promise<void> {
  if (!hasCoordinates(coords)) return
  const { latitude: lat, longitude: lng } = coords
  await openNavigationMenu(lat, lng, 'Destination')
}

async function openFullRouteNav(): Promise<void> {
  if (
    !trip.value ||
    !hasCoordinates(trip.value.pickup_location) ||
    !hasCoordinates(effectiveDrop.value)
  )
    return
  const origin = `${trip.value.pickup_location.latitude},${trip.value.pickup_location.longitude}`
  const destination = `${effectiveDrop.value.latitude},${effectiveDrop.value.longitude}`
  const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=two-wheeler`
  window.open(url, '_system')
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

function formatCoords(coords?: Coordinates | null): string {
  if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
    return 'Not available'
  }
  return `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
}

function formatLocationAddress(coords?: (Coordinates & { address?: string }) | null): string {
  return coords?.address?.trim() || 'Address not available'
}
</script>

<style scoped>
/* ── Typography & Global ─────────────────────────────────────────────────── */
.modern-content {
  --background: var(--color-background);
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.modern-header {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.header-title {
  font-weight: 700;
  font-size: 18px;
  color: var(--color-text);
}
.back-btn {
  color: var(--color-text);
}

.live-tracking-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(16, 185, 129, 0.15);
  color: #059669;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  margin-right: 12px;
}
.pulse-dot {
  width: 8px;
  height: 8px;
  background: var(--color-success);
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
  70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

/* ── Map Section ─────────────────────────────────────────────────────────── */
.map-container {
  position: relative;
  width: 100%;
  border-bottom: 1px solid var(--color-border);
  background: #cbd5e1;
}

.map-actions {
  position: absolute;
  right: 16px;
  bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 10;
}

.map-fab {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.map-fab:active {
  transform: scale(0.95);
}

.map-fab--active {
  background: var(--color-brand);
  color: var(--color-surface);
}

/* ── Details Container ───────────────────────────────────────────────────── */
.details-container {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  z-index: 5;
  margin-top: -24px;
}

.bottom-spacer {
  height: 40px;
}

/* ── Cards Generic ───────────────────────────────────────────────────────── */
.card {
  background: var(--color-surface);
  border-radius: 20px;
  padding: 18px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.03);
  border: 1px solid rgba(0,0,0,0.02);
}

.card-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title .icon {
  color: #6366f1;
}

/* ── Header Card ─────────────────────────────────────────────────────────── */
.header-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.header-card__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.trip-number {
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 4px 0;
  letter-spacing: -0.5px;
}

.trip-time {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0;
  font-weight: 500;
}

.trip-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  background: var(--color-background);
  padding: 14px;
  border-radius: 14px;
}

.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
}

.stat-icon {
  font-size: 18px;
  color: var(--color-text-secondary);
}
.text-blue { color: var(--color-brand); }
.text-green { color: var(--color-success); }
.text-gray { color: var(--color-text-muted); }

.stat-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
}

.stat-label {
  font-size: 11px;
  color: var(--color-text-secondary);
  font-weight: 600;
  text-transform: uppercase;
}

/* ── Beautician Card ─────────────────────────────────────────────────────── */
.beautician-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, var(--color-surface) 0%, #f8faff 100%);
  border: 1px solid var(--color-border);
}

.beautician-profile {
  display: flex;
  align-items: center;
  gap: 14px;
}

.beautician-avatar {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: var(--color-background);
  color: var(--color-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.beautician-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.b-name {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
}

.b-role {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.call-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--color-success);
  color: var(--color-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
  transition: all 0.2s;
}

.call-btn:active {
  transform: scale(0.9);
}

/* ── Route Card ──────────────────────────────────────────────────────────── */
.route-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

.route-point {
  display: flex;
  align-items: stretch;
  gap: 14px;
}

.route-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 16px;
  margin-top: 4px;
}

.indicator-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 3px solid #fff;
  box-shadow: 0 0 0 1.5px currentColor;
  z-index: 2;
  flex-shrink: 0;
}
.indicator-dot.pickup { background: var(--color-success); color: var(--color-success); }
.indicator-dot.drop { background: var(--color-error); color: var(--color-error); }

.indicator-line {
  width: 2px;
  background: var(--color-border);
  flex: 1;
  margin: 4px 0;
  min-height: 24px;
}

.route-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-bottom: 8px;
}

.r-label {
  margin: 0 0 2px 0;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.r-address {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.4;
}

.r-coords {
  margin: 0;
  font-size: 11px;
  color: var(--color-text-muted);
  font-family: monospace;
}

.route-note {
  margin: 8px 0 0;
  padding: 8px 10px;
  border-radius: 10px;
  background: #f8fafc;
  color: var(--color-text);
  font-size: 12px;
  line-height: 1.45;
  font-weight: 500;
}

.nav-icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--color-background);
  color: var(--color-brand);
  border: none;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.nav-icon-btn:disabled,
.nav-icon-btn[aria-disabled='true'] {
  background: var(--color-background);
  color: var(--color-text-muted);
  cursor: not-allowed;
  pointer-events: none;
}
.nav-icon-btn:active { background: var(--color-border); transform: scale(0.95); }

.btn-full-route {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-full-route:active { background: var(--color-background); }

/* ── Extra Meta ──────────────────────────────────────────────────────────── */
.extra-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.extra-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.extra-label { color: var(--color-text-secondary); font-weight: 500; }
.extra-value { color: var(--color-text); font-weight: 700; }
.extra-value--muted { color: var(--color-text-muted); font-weight: 500; }
.extra-value--link { text-decoration: none; color: var(--color-brand); }

/* ── Notes ───────────────────────────────────────────────────────────────── */
.notes-box {
  background: #fffbeb;
  border: 1px solid #fde68a;
  padding: 16px;
  border-radius: 16px;
  display: flex;
  gap: 12px;
}

.notes-icon {
  color: #d97706;
  font-size: 20px;
  flex-shrink: 0;
}

.notes-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
}

.note-row span {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  color: #b45309;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.note-row p {
  margin: 0;
  font-size: 13px;
  color: #92400e;
  line-height: 1.5;
  font-weight: 500;
}

.note-row--attention span,
.note-row--attention p {
  color: #b45309;
}

/* ── Location Override ───────────────────────────────────────────────────── */
.override-card {
  padding: 0;
  overflow: hidden;
}

.override-toggle {
  width: 100%;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: transparent;
  border: none;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.override-toggle-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.override-body {
  padding: 0 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-top: 1px solid var(--color-background);
}

.override-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  margin: 12px 0 0;
}

.override-hint code {
  background: var(--color-background);
  padding: 2px 6px;
  border-radius: 4px;
}

.btn-apply-override {
  background: var(--color-brand);
  color: white;
  padding: 12px;
  border-radius: 10px;
  border: none;
  font-weight: 600;
  margin-top: 8px;
}
.btn-apply-override:disabled { opacity: 0.5; }

/* ── Concern Modal ───────────────────────────────────────────────────────── */
.concern-modal {
  --border-radius: 24px 24px 0 0;
  --height: 100%;
  --max-height: 100%;
  --width: 100%;
}

.concern-modal__header ion-toolbar {
  --background: var(--color-surface);
  --color: var(--color-text);
  --padding-start: 8px;
  --padding-end: 8px;
}

.concern-modal__header ion-title {
  font-size: 18px;
  font-weight: 800;
}

.concern-modal__header ion-button {
  --color: var(--color-text-secondary);
  font-weight: 700;
}

.concern-modal__content {
  --background: var(--color-surface);
}

.concern-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 20px 28px;
}

.concern-form__hint {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.45;
}

.concern-textarea {
  --background: var(--color-background);
  --border-color: var(--color-border);
  --border-radius: 14px;
  --border-style: solid;
  --border-width: 1px;
  --color: var(--color-text);
  --highlight-color-focused: var(--color-brand);
  --padding-bottom: 12px;
  --padding-end: 12px;
  --padding-start: 12px;
  --padding-top: 12px;
  color: var(--color-text);
  font-size: 14px;
  min-height: 128px;
}

.concern-submit {
  --background: var(--color-brand);
  --background-activated: var(--color-brand);
  --border-radius: 16px;
  --box-shadow: 0 8px 24px rgba(79, 70, 229, 0.25);
  --color: #fff;
  font-size: 15px;
  font-weight: 800;
  min-height: 50px;
}

/* ── Footer / Actions ────────────────────────────────────────────────────── */
.modern-footer {
  background: var(--color-surface);
  border-top: 1px solid rgba(0,0,0,0.05);
  padding: 16px 20px 32px 20px;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.04);
}

.footer-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tracking-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-background);
  padding: 12px 16px;
  border-radius: 16px;
  border: 1px solid var(--color-border);
}

.tracking-info {
  display: flex;
  flex-direction: column;
}

.tracking-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text);
}

.tracking-sub {
  font-size: 11px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.tracking-toggle-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-border);
  color: var(--color-text-secondary);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.2s;
}

.tracking-toggle-btn--active {
  background: var(--color-success);
  color: #fff;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-primary-action {
  width: 100%;
  padding: 16px;
  border-radius: 16px;
  background: var(--color-brand);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 8px 24px rgba(79, 70, 229, 0.25);
  transition: all 0.2s;
}

.btn-primary-action:active {
  transform: scale(0.98);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15);
}

.btn-primary-action:disabled {
  background: var(--color-text-muted);
  box-shadow: none;
  transform: none;
}

.btn-secondary-action {
  width: 100%;
  padding: 14px 16px;
  border-radius: 16px;
  background: #fff7ed;
  color: #c2410c;
  font-size: 15px;
  font-weight: 700;
  border: 1px solid #fed7aa;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.2s;
}

.btn-secondary-action:active {
  transform: scale(0.98);
}

.btn-secondary-action:disabled {
  opacity: 0.65;
  transform: none;
}

.btn-spinner {
  width: 20px;
  height: 20px;
}

/* Transitions */
.expand-enter-active, .expand-leave-active {
  transition: max-height 0.3s ease, opacity 0.3s ease;
  max-height: 400px;
  overflow: hidden;
}
.expand-enter-from, .expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
