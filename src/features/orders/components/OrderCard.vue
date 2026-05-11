<template>
  <div class="order-card" @click="emit('click')">
    <div class="order-card__header">
      <div>
        <p class="order-card__number">#{{ order.order_number ?? order.id }}</p>
        <p class="order-card__date">{{ formattedDate }}</p>
      </div>
      <AppBadge :text="order.status" :variant="statusVariant" size="sm" />
    </div>

    <div v-if="customerName" class="order-card__customer">
      <Icon icon="lucide:user" class="order-card__icon" aria-hidden="true" />
      <span>{{ customerName }}</span>
    </div>

    <div v-if="address" class="order-card__address">
      <Icon icon="lucide:map-pin" class="order-card__icon" aria-hidden="true" />
      <span>{{ address }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import AppBadge from '@/shared/components/ui/AppBadge.vue'
import type { Order } from '@/shared/models'
import { formatISTDate } from '@/shared/lib/datetime'

const props = defineProps<{ order: Order }>()
const emit = defineEmits<{ (e: 'click'): void }>()

const statusVariant = computed(() => {
  const s = props.order.status?.toLowerCase()
  if (s === 'completed') return 'success'
  if (s === 'ongoing' || s === 'started') return 'info'
  if (s === 'arrived_and_cancelled') return 'error'
  return 'warning'
})

const customerName = computed(() =>
  props.order.customer?.full_name ?? props.order.customer?.name ?? null
)

const address = computed(() => {
  const a = props.order.delivery_address ?? props.order.address
  if (!a) return null
  return [a.street ?? a.line1, a.city].filter(Boolean).join(', ')
})

const formattedDate = computed(() => {
  const d = props.order.booking_info?.date ?? props.order.service_date ?? props.order.created_at
  if (!d) return ''
  return formatISTDate(d)
})
</script>

<style scoped>
.order-card {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 14px 16px;
  cursor: pointer;
  transition: box-shadow 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.order-card:active {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.order-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.order-card__number {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text);
}

.order-card__date {
  margin: 2px 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.order-card__customer,
.order-card__address {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.order-card__icon {
  font-size: 14px;
  flex-shrink: 0;
  color: var(--color-text-muted);
}
</style>
