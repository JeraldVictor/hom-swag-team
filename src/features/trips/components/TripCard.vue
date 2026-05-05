<template>
  <div class="trip-card" role="article" @click="emit('click')">
    <!-- Status badge -->
    <div class="trip-card__header">
      <TripStatusBadge :state="trip.kanban_state" />
      <span class="trip-card__time">{{ formattedTime }}</span>
    </div>

    <!-- Route row -->
    <div class="trip-card__route">
      <!-- Pickup -->
      <div class="trip-card__location">
        <span class="trip-card__dot trip-card__dot--pickup" aria-hidden="true" />
        <div class="trip-card__location-text">
          <span class="trip-card__location-label">Pickup</span>
          <span class="trip-card__location-address">
            {{ trip.pickup_location.address ?? formatCoords(trip.pickup_location) }}
          </span>
        </div>
      </div>

      <!-- Connector line -->
      <div class="trip-card__connector" aria-hidden="true" />

      <!-- Drop -->
      <div class="trip-card__location">
        <span class="trip-card__dot trip-card__dot--drop" aria-hidden="true" />
        <div class="trip-card__location-text">
          <span class="trip-card__location-label">Drop</span>
          <span class="trip-card__location-address">
            {{ trip.drop_location.address ?? formatCoords(trip.drop_location) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="trip-card__footer">
      <span v-if="trip.customer_name" class="trip-card__customer">
        <Icon icon="lucide:user" class="trip-card__customer-icon" aria-hidden="true" />
        {{ trip.customer_name }}
      </span>
      <span v-else-if="trip.fare" class="trip-card__fare">
        <Icon icon="lucide:indian-rupee" class="trip-card__fare-icon" aria-hidden="true" />
        {{ trip.fare.toFixed(2) }}
      </span>
      <span class="trip-card__cta">
        View details
        <Icon icon="lucide:chevron-right" aria-hidden="true" />
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { formatISTTime } from '@/shared/lib/datetime'
import type { Trip } from '@/shared/models/trip.model'
import type { Coordinates } from '@/shared/models/location.model'
import TripStatusBadge from './TripStatusBadge.vue'

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  trip: Trip
}

const props = defineProps<Props>()

// ── Emits ──────────────────────────────────────────────────────────────────

const emit = defineEmits<{
  (e: 'click'): void
}>()

// ── Computed ───────────────────────────────────────────────────────────────

const formattedTime = computed(() => formatISTTime(props.trip.start_time))

function formatCoords(coords: Coordinates): string {
  return `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
}
</script>

<style scoped>
.trip-card {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 16px;
  cursor: pointer;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.trip-card:active {
  box-shadow: 0 4px 16px rgba(124, 58, 237, 0.12);
  border-color: var(--color-brand-light);
}

/* ── Header ──────────────────────────────────────────────────────────────── */

.trip-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.trip-card__time {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

/* ── Route ───────────────────────────────────────────────────────────────── */

.trip-card__route {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-bottom: 14px;
}

.trip-card__location {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.trip-card__connector {
  width: 2px;
  height: 16px;
  background: var(--color-border);
  margin-left: 7px;
}

.trip-card__dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 2px;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1.5px currentColor;
}

.trip-card__dot--pickup {
  background: var(--color-success);
  color: var(--color-success);
}

.trip-card__dot--drop {
  background: var(--color-error);
  color: var(--color-error);
}

.trip-card__location-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.trip-card__location-label {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.trip-card__location-address {
  font-size: var(--font-size-sm);
  color: var(--color-text);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Footer ──────────────────────────────────────────────────────────────── */

.trip-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.trip-card__fare {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text);
}

.trip-card__fare-icon {
  font-size: 14px;
}

.trip-card__customer {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
}

.trip-card__customer-icon {
  font-size: 14px;
  color: var(--color-text-muted);
}

.trip-card__cta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-brand);
}
</style>
