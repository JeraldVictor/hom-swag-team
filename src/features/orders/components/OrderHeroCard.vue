<template>
  <div class="order-hero">
    <!-- Active order: show customer info + actions -->
    <template v-if="!isCustomerHidden">
      <div class="hero-top-row">
        <span class="order-num-pill">#{{ orderNumber }}</span>
        <span class="hero-badge">{{ statusLabel }}</span>
      </div>
      <p class="hero-customer-name">{{ customerName }}</p>
      <div class="hero-details">
        <div class="hero-detail-item">
          <Icon icon="lucide:map-pin" class="detail-icon" />
          <span>{{ address }}</span>
        </div>
        <div class="hero-detail-item" v-if="effective_start_time && effective_end_time">
          <Icon icon="lucide:clock" class="detail-icon" />
          <span>{{ formatTime12(effective_start_time) }} - {{ formatTime12(effective_end_time) }}</span>
        </div>
      </div>
      <div v-if="showActions && isRideActionVisible" class="hero-actions">
        <button class="hbtn hbtn-nav" @click="$emit('navigate')">
          <Icon icon="lucide:navigation" class="hbtn-icon" />
          <span>Navigate</span>
        </button>
        <button class="hbtn hbtn-ride" @click="$emit('bookRide')">
          <Icon icon="lucide:car-taxi-front" class="hbtn-icon" />
          <span>Ride</span>
        </button>
        <a v-if="phone" class="hbtn hbtn-icon-only" :href="'tel:' + phone">
          <Icon icon="lucide:phone" />
        </a>
        <button class="hbtn hbtn-icon-only" @click="$emit('copyAddress')">
          <Icon icon="lucide:copy" />
        </button>
      </div>
    </template>

    <!-- Completed / cancelled: masked summary -->
    <template v-else>
      <div class="hero-top-row">
        <div>
          <p class="hero-order-label">Order</p>
          <span class="order-num-pill">#{{ orderNumber }}</span>
        </div>
        <span class="hero-badge">{{ statusLabel }}</span>
      </div>
      <div class="hero-masked-grid">
        <div class="masked-cell">
          <p class="masked-cell-label">Amount</p>
          <p class="masked-cell-value">₹{{ total }}</p>
        </div>
        <div class="masked-cell">
          <p class="masked-cell-label">Date</p>
          <p class="masked-cell-value">{{ date }}</p>
        </div>
        <div class="masked-cell" v-if="effective_start_time && effective_end_time">
          <p class="masked-cell-label">Duration</p>
          <p class="masked-cell-value">{{ formatTime12(effective_start_time) }} - {{ formatTime12(effective_end_time) }}</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ORDER_STATUS } from '../../../shared/constants'
import { formatTime12 } from '../../../shared/lib/datetime'

const props = defineProps<{
  orderNumber: string | number
  statusLabel: string
  statusVariant: string
  status: ORDER_STATUS
  customerName: string
  address: string
  effective_start_time?: string
  effective_end_time?: string
  phone?: string
  isCustomerHidden: boolean
  showActions: boolean
  total: number
  date: string
}>()

const isRideActionVisible = computed(() => {
  return [
    ORDER_STATUS.PENDING,
    ORDER_STATUS.ASSIGNED_DRAFT,
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.ONGOING,
    ORDER_STATUS.REACHED_CUSTOMER_PLACE,
    ORDER_STATUS.STARTED,
    ORDER_STATUS.RE_ASSIGN_REQUIRED,
  ].includes(props.status)
})

defineEmits<{
  navigate: []
  bookRide: []
  copyAddress: []
}>()
</script>

<style scoped>
.order-hero {
  background: linear-gradient(150deg, var(--color-brand) 0%, var(--color-brand-mid, #5b21b6) 100%);
  padding: 12px 16px 16px;
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;
  box-shadow: 0 6px 20px rgba(124, 58, 237, 0.2);
  color: white;
  position: relative;
  overflow: hidden;
}

.order-hero::before {
  content: '';
  position: absolute;
  top: -30%;
  right: -8%;
  width: 180px;
  height: 180px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, transparent 70%);
  pointer-events: none;
}

.hero-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  position: relative;
  z-index: 1;
}

.hero-order-label {
  margin: 0 0 2px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  opacity: 0.65;
}

.order-num-pill {
  display: inline-flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(4px);
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: white;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.hero-customer-name {
  margin: 0 0 5px;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
  position: relative;
  z-index: 1;
}

.hero-details {
  display: flex;
  flex-direction: column;
  gap: 3px;
  position: relative;
  z-index: 1;
}

.hero-detail-item {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
  line-height: 1.4;
}

.detail-icon {
  font-size: 11px;
  opacity: 0.7;
  margin-top: 2px;
  flex-shrink: 0;
}

/* ── Action Buttons ── */
.hero-actions {
  display: flex;
  gap: 7px;
  margin-top: 12px;
  position: relative;
  z-index: 1;
}

.hbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px 12px;
  border-radius: 10px;
  border: none;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
  transition: opacity 0.15s, transform 0.1s;
  line-height: 1;
  -webkit-tap-highlight-color: transparent;
}

.hbtn:active {
  opacity: 0.7;
  transform: scale(0.96);
}

.hbtn-nav {
  background: white;
  color: var(--color-brand);
  flex: 1.3;
}

.hbtn-ride {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  flex: 1;
}

.hbtn-icon-only {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 8px 11px;
  font-size: 15px;
}

.hbtn-icon {
  font-size: 13px;
}

/* ── Masked Grid ── */
.hero-masked-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 12px;
  position: relative;
  z-index: 1;
}

.masked-cell {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 8px 10px;
}

.masked-cell-label {
  margin: 0;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  opacity: 0.65;
}

.masked-cell-value {
  margin: 3px 0 0;
  font-size: 13px;
  font-weight: 700;
}
</style>
