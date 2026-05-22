<template>
  <div class="trip-card" role="article" @click="emit('click')">
    <!-- Header: Status & Time -->
    <div class="trip-card__header">
      <div class="trip-card__status-wrap">
        <div class="trip-card__pulse" :class="`pulse--${statusColor}`" aria-hidden="true" />
        <span class="trip-card__status-text" :class="`text--${statusColor}`">
          {{ formattedStatus }}
        </span>
      </div>
      <span class="trip-card__time">{{ formattedTime }}</span>
    </div>

    <!-- Beautician Info -->
    <div v-if="trip.beautician_name" class="trip-card__beautician">
      <div class="trip-card__beautician-avatar">
        <Icon icon="lucide:user" />
      </div>
      <div class="trip-card__beautician-info">
        <span class="trip-card__beautician-name">{{ trip.beautician_name }}</span>
        <span class="trip-card__beautician-role">Assigned Beautician</span>
      </div>
    </div>

    <!-- Route Section -->
    <div class="trip-card__route-container">
      <!-- Pickup Row -->
      <div class="trip-card__route-row">
        <div class="trip-card__route-icon-col">
          <div class="route-dot route-dot--pickup" />
          <div class="route-line" />
        </div>
        <div class="trip-card__route-content">
          <span class="route-label">Pickup Location</span>
          <span class="route-address">{{ trip.pickup_location.address ?? formatCoords(trip.pickup_location) }}</span>
        </div>
        <button class="route-nav-btn" aria-label="Navigate to Pickup" @click.stop="navTo(trip.pickup_location)">
          <Icon icon="lucide:navigation" />
        </button>
      </div>

      <!-- Drop Row -->
      <div class="trip-card__route-row">
        <div class="trip-card__route-icon-col">
          <div class="route-dot route-dot--drop" />
        </div>
        <div class="trip-card__route-content">
          <span class="route-label">Drop Location</span>
          <span class="route-address">{{ trip.drop_location.address ?? formatCoords(trip.drop_location) }}</span>
        </div>
        <button class="route-nav-btn" aria-label="Navigate to Drop" @click.stop="navTo(trip.drop_location)">
          <Icon icon="lucide:navigation" />
        </button>
      </div>
    </div>

    <!-- Footer -->
    <div class="trip-card__footer">
      <div class="trip-card__footer-info">
        <span v-if="trip.auto_distance_km" class="trip-card__distance">
          <Icon icon="lucide:map" class="footer-icon" />
          ~{{ trip.auto_distance_km }} km
        </span>
        <span v-if="trip.fare" class="trip-card__fare">
          <Icon icon="lucide:indian-rupee" class="footer-icon" />
          {{ trip.fare.toFixed(2) }}
        </span>
      </div>
      <span class="trip-card__cta">
        Details <Icon icon="lucide:arrow-right" />
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatISTTime } from '@/shared/lib/datetime'
import type { Coordinates } from '@/shared/models/location.model'
import type { Trip } from '@/shared/models/trip.model'
import { useNavigation } from '@/shared/composables/useNavigation'

// ── Props & Emits ──────────────────────────────────────────────────────────

interface Props {
  trip: Trip
}

const props = defineProps<Props>()
const emit = defineEmits<(e: 'click') => void>()

// ── Composables ────────────────────────────────────────────────────────────

const { openNavigationMenu } = useNavigation()

// ── Computed ───────────────────────────────────────────────────────────────

const formattedTime = computed(() => formatISTTime(props.trip.start_time))

const formattedStatus = computed(() => {
  const s = props.trip.kanban_state
  if (s === 'assigned') return 'Assigned'
  if (s === 'viewed_by_rider') return 'Viewed'
  if (s === 'trip_started') return 'In Progress'
  if (s === 'dropped_and_waiting') return 'Drop & Wait'
  if (s === 'trip_completed') return 'Trip Completed'
  if (s === 'fare_calculation_pending') return 'Fare Pending'
  if (s === 'completed') return 'Completed'
  if (s === 'cancelled') return 'Cancelled'
  return 'Pending'
})

const statusColor = computed(() => {
  const s = props.trip.kanban_state
  if (s === 'trip_started' || s === 'dropped_and_waiting') return 'active'
  if (s === 'completed' || s === 'trip_completed') return 'success'
  if (s === 'cancelled') return 'error'
  return 'default'
})

// ── Methods ────────────────────────────────────────────────────────────────

function formatCoords(coords?: Coordinates): string {
  if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
    return 'Pending Location'
  }
  return `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
}

async function navTo(coords?: Coordinates) {
  if (!coords || typeof coords.latitude !== 'number') return
  await openNavigationMenu(coords.latitude, coords.longitude, 'Location')
}
</script>

<style scoped>
.trip-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
  -webkit-tap-highlight-color: transparent;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.trip-card:active {
  transform: scale(0.98);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.trip-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.trip-card__status-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f8f9fa;
  padding: 4px 10px;
  border-radius: 30px;
}

.trip-card__status-text {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.text--active { color: #f59e0b; }
.text--success { color: #10b981; }
.text--error { color: #ef4444; }
.text--default { color: #6366f1; }

.trip-card__pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.pulse--active { background: #f59e0b; box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2); }
.pulse--success { background: #10b981; }
.pulse--error { background: #ef4444; }
.pulse--default { background: #6366f1; }

.trip-card__time {
  font-size: 12px;
  color: #8b92a5;
  font-weight: 500;
}

/* ── Beautician ──────────────────────────────────────────────────────────── */
.trip-card__beautician {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #f8faff;
  border-radius: 12px;
}

.trip-card__beautician-avatar {
  width: 36px;
  height: 36px;
  background: #eef2ff;
  color: #6366f1;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.trip-card__beautician-info {
  display: flex;
  flex-direction: column;
}

.trip-card__beautician-name {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.trip-card__beautician-role {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
}

/* ── Route ───────────────────────────────────────────────────────────────── */
.trip-card__route-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.trip-card__route-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-height: 44px;
}

.trip-card__route-icon-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 16px;
  margin-top: 4px;
}

.route-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2.5px solid #fff;
  box-shadow: 0 0 0 1px currentColor;
  z-index: 2;
}
.route-dot--pickup { background: #10b981; color: #10b981; }
.route-dot--drop { background: #ef4444; color: #ef4444; }

.route-line {
  width: 2px;
  height: 28px;
  background: #e2e8f0;
  margin: 2px 0;
}

.trip-card__route-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.route-label {
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.route-address {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.route-nav-btn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #f1f5f9;
  color: #3b82f6;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  font-size: 16px;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.15s ease;
}

.route-nav-btn:active {
  background: #e2e8f0;
  transform: scale(0.95);
}

/* ── Footer ──────────────────────────────────────────────────────────────── */
.trip-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 14px;
  border-top: 1px dashed #e2e8f0;
}

.trip-card__footer-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.trip-card__distance,
.trip-card__fare {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 700;
  color: #475569;
}

.footer-icon {
  font-size: 14px;
  color: #94a3b8;
}

.trip-card__cta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 700;
  color: #6366f1;
}

.trip-card__cta .icon {
  font-size: 14px;
}
</style>
