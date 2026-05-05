<template>
  <span class="status-badge" :class="`status-badge--${colorClass}`" :aria-label="`Status: ${state}`">
    <span class="status-badge__dot" aria-hidden="true" />
    {{ state }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TripKanbanState } from '@/shared/models/trip.model'

interface Props {
  state: TripKanbanState
}

const props = defineProps<Props>()

const colorClass = computed(() => {
  switch (props.state) {
    case 'requests':
    case 'Assigned':
      return 'info'
    case 'Viewed':
      return 'warning'
    case 'Trip Started':
      return 'brand'
    case 'Trip Completed':
      return 'success'
    case 'Fare Calculated':
    case 'Completed':
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
