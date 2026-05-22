<template>
  <span class="status-badge" :class="`status-badge--${colorClass}`" :aria-label="`Status: ${label}`">
    <span class="status-badge__dot" aria-hidden="true" />
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TripKanbanState } from '@/shared/models/trip.model'

interface Props {
  state: TripKanbanState
}

const props = defineProps<Props>()

const label = computed(() => {
  switch (props.state) {
    case 'requests':
      return 'Requested'
    case 'assigned':
      return 'Assigned'
    case 'viewed_by_rider':
      return 'Viewed'
    case 'trip_started':
      return 'Trip Started'
    case 'dropped_and_waiting':
      return 'Drop & Wait'
    case 'trip_completed':
      return 'Trip Completed'
    case 'fare_calculation_pending':
      return 'Fare Calculated'
    case 'completed':
      return 'Completed'
    case 'cancelled':
      return 'Cancelled'
    default:
      return props.state
  }
})

const colorClass = computed(() => {
  switch (props.state) {
    case 'requests':
    case 'assigned':
      return 'info'
    case 'viewed_by_rider':
      return 'warning'
    case 'trip_started':
    case 'dropped_and_waiting':
      return 'brand'
    case 'trip_completed':
      return 'success'
    case 'fare_calculation_pending':
    case 'completed':
    case 'cancelled':
      return 'muted'
    default:
      return 'muted'
  }
})
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
  letter-spacing: 0.3px;
  white-space: nowrap;
}

.status-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

/* Color variants */
.status-badge--info {
  background: var(--color-info-bg);
  color: var(--color-info-text);
}

.status-badge--warning {
  background: var(--color-warning-bg);
  color: var(--color-warning-text);
}

.status-badge--brand {
  background: var(--color-brand-pale);
  color: var(--color-brand);
}

.status-badge--success {
  background: var(--color-success-bg);
  color: var(--color-success-text);
}

.status-badge--muted {
  background: var(--color-border);
  color: var(--color-text-muted);
}
</style>
