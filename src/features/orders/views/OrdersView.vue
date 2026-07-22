<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button class="header-icon-btn" aria-label="Open menu" @click="openMenu">
            <Icon icon="lucide:menu" class="header-icon" />
          </ion-button>
        </ion-buttons>
        <ion-title>Orders</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh" class="modern-refresher">
        <ion-refresher-content
          pulling-text="Pull to refresh"
          refreshing-spinner="crescent"
        />
      </ion-refresher>

      <!-- Filters with Glassmorphism -->
      <div class="filters-container">
        <div class="date-filters">
          <ion-segment v-model="dateFilter" mode="md">
            <ion-segment-button value="today">
              <ion-label>Today</ion-label>
            </ion-segment-button>
            <ion-segment-button value="tomorrow">
              <ion-label>Tomorrow</ion-label>
            </ion-segment-button>
            <ion-segment-button value="past">
              <ion-label>Past</ion-label>
            </ion-segment-button>
          </ion-segment>
        </div>

        <div class="status-filters">
          <div class="filter-chips">
            <div 
              v-for="status in statusOptions" 
              :key="status"
              class="filter-chip"
              :class="{ 'filter-chip--active': statusFilter === status }"
              @click="statusFilter = status"
            >
              {{ status }} ({{ statusCounts[status] ?? 0 }})
            </div>
          </div>
        </div>
      </div>

      <!-- Loading state & Orders list -->
      <div v-if="error && filteredOrders.length === 0" class="orders-empty">
        <div class="empty-icon-wrapper">
          <Icon icon="lucide:wifi-off" class="orders-empty__icon" aria-hidden="true" />
        </div>
        <p class="orders-empty__title">Could not load orders</p>
        <p class="orders-empty__text">{{ error }}</p>
        <AppButton variant="outline" size="sm" @click="fetchOrders()" style="margin-top: 16px;">
          Retry
        </AppButton>
      </div>

      <div v-else-if="!isLoading && filteredOrders.length === 0" class="orders-empty">
        <div class="empty-icon-wrapper">
          <Icon icon="lucide:briefcase" class="orders-empty__icon" aria-hidden="true" />
        </div>
        <p class="orders-empty__title">No orders found</p>
        <p class="orders-empty__text">Adjust your filters or check back later.</p>
      </div>

      <template v-else>
        <div v-if="error" class="orders-error-banner" role="alert">
          <Icon icon="lucide:alert-circle" aria-hidden="true" />
          {{ error }}
        </div>
        
        <div class="orders-list anim-list">
          <!-- Skeleton State -->
          <phantom-ui 
            v-if="isLoading && filteredOrders.length === 0" 
            loading 
            count="5" 
            count-gap="12"
            animation="shimmer"
            stagger="0.05"
          >
            <OrderCard :order="placeholderOrder" />
          </phantom-ui>

          <!-- Real Content -->
          <template v-else>
            <OrderCard
              v-for="order in filteredOrders"
              :key="order.id ?? order._id"
              :order="order"
              @click="goToDetail(order.id ?? order._id ?? '')"
            />
          </template>
        </div>

        <!-- Infinite Scroll -->
        <ion-infinite-scroll 
          @ionInfinite="loadData" 
          :disabled="!hasMore"
        >
          <ion-infinite-scroll-content loading-spinner="bubbles" loading-text="Loading more orders..." />
        </ion-infinite-scroll>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onIonViewWillEnter } from '@ionic/vue'
import { onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDrawer } from '@/shared/composables'
import type { Order } from '@/shared/models'
import { type OrderDateFilter, type OrderTab, useOrders } from '../composables/useOrders'

const router = useRouter()
const route = useRoute()
const {
  filteredOrders,
  isLoading,
  error,
  fetchOrders,
  refresh,
  loadMore,
  statusFilter,
  dateFilter,
  hasMore,
  statusCounts,
} = useOrders()
const { openDrawer } = useDrawer()
let refreshTimer: number | undefined
const placeholderOrder: Order = {
  id: 'skeleton',
  order_number: '123456',
  status: 'Confirmed',
  customer: { full_name: 'Placeholder Name', phone: '1234567890' },
  booking_info: { date: '2024-01-01', timing: '10:00 AM - 12:00 PM' },
  address: { street: '123 Placeholder St', city: 'Placeholder City' },
} as Order // using as Order to satisfy the interface which has many optional but some required fields like id

const statusOptions: OrderTab[] = ['Confirmed', 'Ongoing', 'Completed', 'Cancelled']

function normalizeStatus(value: string): OrderTab | null {
  const normalized = value.toLowerCase()
  if (['confirmed', 'reached_customer_place'].includes(normalized)) return 'Confirmed'
  if (['started', 'ongoing'].includes(normalized)) return 'Ongoing'
  if (['completed'].includes(normalized)) return 'Completed'
  if (
    ['cancelled', 'cancel_requested', 'cancelled_and_refunded', 'arrived_and_cancelled'].includes(
      normalized
    )
  )
    return 'Cancelled'
  return null
}

function openMenu(): void {
  openDrawer()
}

function scheduleOrderRefresh(): void {
  window.clearTimeout(refreshTimer)
  refreshTimer = window.setTimeout(() => {
    void refresh()
  }, 100)
}

onMounted(() => {
  // Handle query params
  if (route.query.date && route.query.date !== 'undefined') {
    dateFilter.value = route.query.date as OrderDateFilter
  }
  if (route.query.status && route.query.status !== 'undefined') {
    const normalized = normalizeStatus(String(route.query.status))
    if (normalized) statusFilter.value = normalized
  }
  window.addEventListener('homswag:order-data-changed', scheduleOrderRefresh)
  fetchOrders()
})

onUnmounted(() => {
  window.removeEventListener('homswag:order-data-changed', scheduleOrderRefresh)
  window.clearTimeout(refreshTimer)
})

onIonViewWillEnter(() => {
  refresh()
})

async function handleRefresh(event: CustomEvent): Promise<void> {
  await refresh()
  ;(event.target as HTMLIonRefresherElement).complete()
}

async function loadData(event: CustomEvent): Promise<void> {
  await loadMore()
  ;(event.target as HTMLIonInfiniteScrollElement).complete()
}

function goToDetail(id: string | number): void {
  router.push(`/orders/${id}`)
}
</script>

<style scoped>
.header-icon-btn {
  --padding-start: 8px;
  --padding-end: 8px;
  --color: var(--color-text);
}

.header-icon { font-size: 22px; }

.filters-container {
  background: rgba(249, 250, 251, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: var(--spacing-3) var(--spacing-4);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.date-filters {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 4px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

ion-segment {
  --background: transparent;
  background: transparent;
}

ion-segment-button {
  --indicator-color: var(--color-brand);
  --color-checked: var(--color-brand);
  --border-radius: var(--radius-md);
  font-weight: 600;
  min-height: 36px;
}

.filter-chips {
  display: flex;
  gap: var(--spacing-2);
  overflow-x: auto;
  padding: 4px 0;
  scrollbar-width: none;
}

.filter-chips::-webkit-scrollbar {
  display: none;
}

.filter-chip {
  padding: 6px 14px;
  border-radius: var(--radius-full);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  white-space: nowrap;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}

.filter-chip--active {
  background: var(--color-brand);
  border-color: var(--color-brand);
  color: white;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2);
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  padding: var(--spacing-4);
}

.orders-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  text-align: center;
}

.empty-icon-wrapper {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-2xl);
  background: var(--color-brand-pale);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--spacing-4);
}

.orders-empty__icon {
  font-size: 32px;
  color: var(--color-brand);
}

.orders-empty__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text);
}

.orders-empty__text {
  margin: 4px 0 0;
  font-size: var(--font-size-base);
  color: var(--color-text-muted);
}

.orders-error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px 16px 0;
  padding: 12px;
  background: var(--color-error-bg);
  color: var(--color-error-text);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.modern-refresher {
  z-index: 101;
}

.anim-list > * {
  animation: slide-up-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes slide-up-fade {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
