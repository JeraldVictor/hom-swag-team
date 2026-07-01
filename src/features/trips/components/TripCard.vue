<template>
  <div class="order-card" @click="emit('click')">
    <!-- Header: ID, Date, Badge -->
    <div class="order-card__header">
      <div class="order-card__id-group">
        <span class="order-card__number">{{ trip.trip_number || trip.id }}</span>
        <span class="order-card__date">{{ formattedDate }}</span>
      </div>
      <AppBadge :text="formattedStatus" :variant="statusVariant" size="sm" />
    </div>

    <!-- Body: Info Rows -->
    <div class="order-card__body">
      <div v-if="trip.customer_name" class="order-card__info-row">
        <div class="order-card__icon-container">
          <Icon icon="lucide:user-round" class="order-card__icon" aria-hidden="true" />
        </div>
        <span class="order-card__customer">{{ trip?.customer_name }}</span>
      </div>
      
      <!-- Beautician Name -->
      <div v-if="trip?.beautician_name" class="order-card__info-row">
        <div class="order-card__icon-container">
          <Icon icon="lucide:user" class="order-card__icon" aria-hidden="true" />
        </div>
        <span class="order-card__customer">{{ trip?.beautician_name }}</span>
        <a v-if="trip?.beautician_phone" :href="'tel:' + trip?.beautician_phone" class="phone-btn" @click.stop>
          <Icon icon="lucide:phone" />
        </a>
      </div>

      <!-- Pickup Location -->
      <div class="order-card__info-row order-card__info-row--location">
        <div class="order-card__icon-container">
          <div class="route-dot route-dot--pickup"></div>
        </div>
        <div class="order-card__location-text">
          <span class="order-card__location-label">Pickup Address</span>
          <span class="order-card__address">{{ formatLocationAddress(trip?.pickup_location) }}</span>
          <span class="order-card__coords">Lat, Lng: {{ formatCoords(trip?.pickup_location) }}</span>
        </div>
        <button 
          v-if="hasCoordinates(trip?.pickup_location)" 
          class="nav-btn" 
          @click.stop="navTo(trip?.pickup_location)"
        >
          <Icon icon="lucide:navigation" />
        </button>
      </div>

      <!-- Drop Location -->
      <div class="order-card__info-row order-card__info-row--location">
        <div class="order-card__icon-container">
          <div class="route-dot route-dot--drop"></div>
        </div>
        <div class="order-card__location-text">
          <span class="order-card__location-label">Drop Address</span>
          <span class="order-card__address">{{ formatLocationAddress(trip?.drop_location) }}</span>
          <span class="order-card__coords">Lat, Lng: {{ formatCoords(trip?.drop_location) }}</span>
        </div>
        <button 
          v-if="hasCoordinates(trip?.drop_location)" 
          class="nav-btn" 
          @click.stop="navTo(trip?.drop_location)"
        >
          <Icon icon="lucide:navigation" />
        </button>
      </div>

      <!-- Stats: Distance & Fare -->
      <div class="order-card__info-row">
        <div class="order-card__icon-container">
          <Icon icon="lucide:map" class="order-card__icon" aria-hidden="true" />
        </div>
        <span class="order-card__items" v-if="totalDistance != null">{{ totalDistance }} km</span>
        <span class="order-card__items" v-else>Distance N/A</span>

        <span v-if="trip?.fare != null" class="order-card__total" style="margin-left: auto; font-weight: 800; color: var(--color-brand);">
          ₹{{ trip?.fare }}
        </span>
      </div>
    </div>

    <!-- Footer: Time -->
    <div class="order-card__footer" v-if="trip?.start_time">
      <Icon icon="lucide:clock" class="footer-icon" />
      <span>{{ formatTime12(trip?.start_time) }}</span>
      <span style="margin-left: auto; color: var(--color-brand); display: flex; align-items: center; gap: 4px;">
        View Details <Icon icon="lucide:arrow-right" style="font-size: 14px;" />
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppBadge from '@/shared/components/ui/AppBadge.vue'
import { useNavigation } from '@/shared/composables/useNavigation'
import { formatISTDate, formatTime12 } from '@/shared/lib/datetime'
import type { Coordinates } from '@/shared/models/location.model'
import type { Trip } from '@/shared/models/trip.model'

interface Props {
  trip: Trip
}

const props = defineProps<Props>()
const emit = defineEmits<(e: 'click') => void>()
const { openNavigationMenu } = useNavigation()

const formattedDate = computed(() =>
  formatISTDate(props.trip.start_time || new Date().toISOString())
)

const formattedStatus = computed(() => {
  const s = props.trip.kanban_state
  if (s === 'assigned') return 'Assigned'
  if (s === 'viewed_by_rider') return 'Viewed'
  if (s === 'trip_started') return 'Started'
  if (s === 'dropped_and_waiting') return 'Waiting'
  if (s === 'trip_completed') return 'Completed'
  if (s === 'fare_calculation_pending') return 'Fare Pending'
  if (s === 'completed') return 'Completed'
  if (s === 'cancelled') return 'Cancelled'
  return 'Pending'
})

const statusVariant = computed(() => {
  const s = props.trip.kanban_state
  if (s === 'completed' || s === 'trip_completed') return 'success'
  if (s === 'trip_started' || s === 'dropped_and_waiting' || s === 'fare_calculation_pending')
    return 'brand'
  if (s === 'cancelled') return 'danger'
  return 'warning'
})

const totalDistance = computed(() => {
  const autoKm = props.trip?.auto_distance_km
  if (autoKm == null) return null
  const multiplier = props.trip?.is_two_way ? 2 : 1
  return Number((autoKm * multiplier + (props.trip?.extra_km ?? 0)).toFixed(2))
})

function formatCoords(coords?: Coordinates): string {
  if (!coords || typeof coords?.latitude !== 'number' || typeof coords?.longitude !== 'number') {
    return 'Location not available'
  }
  return `${coords.latitude?.toFixed(5)}, ${coords.longitude?.toFixed(5)}`
}

function formatLocationAddress(coords?: Coordinates & { address?: string }): string {
  return coords?.address?.trim() || 'Address not available'
}

function hasCoordinates(coords?: Coordinates): coords is Coordinates {
  return !!coords && Number.isFinite(coords?.latitude) && Number.isFinite(coords?.longitude)
}

async function navTo(coords?: Coordinates) {
  if (!hasCoordinates(coords)) return
  await openNavigationMenu(coords?.latitude, coords?.longitude, 'Location')
}
</script>

<style scoped>
.order-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--spacing-4);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-tap-highlight-color: transparent;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  margin-bottom: 12px;
}

.order-card:active {
  transform: scale(0.98);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);
  background: var(--color-background);
}

.order-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-3);
}

.order-card__id-group {
  display: flex;
  flex-direction: column;
}

.order-card__number {
  font-size: var(--font-size-md);
  font-weight: 800;
  color: var(--color-text);
  line-height: 1.2;
}

.order-card__date {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  font-weight: 600;
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.order-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.order-card__info-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.order-card__info-row--location {
  align-items: flex-start;
}

.order-card__icon-container {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  background: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.order-card__icon {
  font-size: 14px;
  color: var(--color-brand);
}

.route-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--color-surface);
  box-shadow: 0 0 0 1px currentColor;
}
.route-dot--pickup { background: var(--color-success); color: var(--color-success); }
.route-dot--drop { background: var(--color-error); color: var(--color-error); }

.order-card__customer {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-secondary);
}

.order-card__address {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.order-card__location-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.order-card__location-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.order-card__coords {
  font-size: 11px;
  color: var(--color-text-muted);
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.order-card__items {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  font-weight: 500;
}

.nav-btn, .phone-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: var(--color-background);
  color: var(--color-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  font-size: 14px;
  flex-shrink: 0;
  cursor: pointer;
  margin-left: auto;
  transition: all 0.15s ease;
}

.nav-btn:active, .phone-btn:active {
  transform: scale(0.95);
  background: var(--color-surface);
}

.order-card__footer {
  margin-top: var(--spacing-3);
  padding-top: var(--spacing-3);
  border-top: 1px dashed var(--color-border);
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-brand);
}

.footer-icon {
  font-size: 14px;
}
</style>
