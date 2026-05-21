<template>
  <div class="order-card" @click="emit('click')">
    <div class="order-card__header">
      <div class="order-card__id-group">
        <span class="order-card__number">#{{ order.order_number ?? order.id }}</span>
        <span class="order-card__date">{{ formattedDate }}</span>
      </div>
      <AppBadge :text="order.status" :variant="statusVariant" size="sm" />
    </div>

    <div class="order-card__body">
      <div v-if="customerName" class="order-card__info-row">
        <div class="order-card__icon-container">
          <Icon icon="lucide:user" class="order-card__icon" aria-hidden="true" />
        </div>
        <span class="order-card__customer">{{ customerName }}</span>
      </div>

      <div v-if="address" class="order-card__info-row">
        <div class="order-card__icon-container">
          <Icon icon="lucide:map-pin" class="order-card__icon" aria-hidden="true" />
        </div>
        <span class="order-card__address">{{ address }}</span>
      </div>

      <div class="order-card__info-row">
        <div class="order-card__icon-container">
          <Icon icon="lucide:shopping-bag" class="order-card__icon" aria-hidden="true" />
        </div>
        <span class="order-card__items">{{ order.products?.length || 0 }} Items</span>
        <span class="order-card__total" style="margin-left: auto; font-weight: 800; color: var(--color-brand);">₹{{ order.total }}</span>
      </div>
    </div>

    <div class="order-card__footer" v-if="order.booking_info?.beautician_start_time">
      <Icon icon="lucide:clock" class="footer-icon" />
      <span>{{ formatTime12(order.booking_info.beautician_start_time) }}</span>
    </div>
    <div class="order-card__footer" v-else-if="order.booking_info?.timing">
      <Icon icon="lucide:clock" class="footer-icon" />
      <span>{{ order.booking_info.timing }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatISTDate, formatTime12 } from '@/shared/lib/datetime'
import type { Order } from '@/shared/models'

const props = defineProps<{ order: Order }>()
const emit = defineEmits<(e: 'click') => void>()

const statusVariant = computed(() => {
  const s = props.order.status?.toLowerCase()
  if (s === 'completed') return 'success'
  if (s === 'ongoing' || s === 'started' || s === 'confirmed') return 'brand'
  if (s === 'arrived_and_cancelled' || s === 'cancelled' || s === 'cancel_requested')
    return 'danger'
  return 'warning'
})

const customerName = computed(
  () => props.order.customer?.full_name ?? props.order.customer?.name ?? null
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
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--spacing-4);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-tap-highlight-color: transparent;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
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
