<template>
  <ion-page>
    <ion-header :translucent="true">
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
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <!-- Filters -->
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
              {{ status }}
            </div>
          </div>
        </div>
      </div>

      <!-- Loading state & Orders list -->
      <div v-if="error && filteredOrders.length === 0" class="orders-empty">
        <Icon icon="lucide:wifi-off" class="orders-empty__icon" aria-hidden="true" />
        <p class="orders-empty__title">Could not load orders</p>
        <p class="orders-empty__text">{{ error }}</p>
        <ion-button fill="outline" size="small" @click="fetchOrders()">Retry</ion-button>
      </div>

      <div v-else-if="!isLoading && filteredOrders.length === 0" class="orders-empty">
        <Icon icon="lucide:briefcase" class="orders-empty__icon" aria-hidden="true" />
        <p class="orders-empty__title">No orders found</p>
        <p class="orders-empty__text">Adjust your filters or check back later.</p>
      </div>

      <template v-else>
        <div v-if="error" class="orders-error-banner" role="alert">
          <Icon icon="lucide:alert-circle" aria-hidden="true" />
          {{ error }}
        </div>
        
        <div class="orders-list anim-list">
          <phantom-ui 
            :loading="isLoading && filteredOrders.length === 0" 
            :count="isLoading && filteredOrders.length === 0 ? 5 : 1" 
            count-gap="12"
            animation="shimmer"
            stagger="0.05"
          >
            <OrderCard
              v-for="order in (isLoading && filteredOrders.length === 0 ? [placeholderOrder] : filteredOrders)"
              :key="order.id ?? order._id ?? 'skeleton'"
              :order="order"
              @click="goToDetail(order.id ?? order._id ?? '')"
            />
          </phantom-ui>
        </div>

        <!-- Infinite Scroll -->
        <ion-infinite-scroll 
          @ionInfinite="loadData" 
          :disabled="currentPage >= totalPages"
        >
          <ion-infinite-scroll-content loading-spinner="bubbles" loading-text="Loading more orders..." />
        </ion-infinite-scroll>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
  IonRefresher, IonRefresherContent, onIonViewWillEnter,
  IonSegment, IonSegmentButton, IonLabel,
  IonInfiniteScroll, IonInfiniteScrollContent,
} from '@ionic/vue'
import { Icon } from '@iconify/vue'
import { useOrders, type OrderDateFilter } from '../composables/useOrders'
import OrderCard from '../components/OrderCard.vue'
import type { Order, OrderStatus } from '@/shared/models'
import { useDrawer } from '@/shared/composables'

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
  currentPage,
  totalPages
} = useOrders()
const { openDrawer } = useDrawer()
const placeholderOrder: Order = {
  id: 'skeleton',
  order_number: '123456',
  status: 'Confirmed',
  customer: { full_name: 'Placeholder Name', phone: '1234567890' },
  booking_info: { date: '2024-01-01', timing: '10:00 AM - 12:00 PM' },
  address: { street: '123 Placeholder St', city: 'Placeholder City' }
} as Order // using as Order to satisfy the interface which has many optional but some required fields like id

const statusOptions: (OrderStatus | 'All')[] = ['All', 'Confirmed', 'Started', 'Ongoing', 'Completed', 'Cancelled']

function openMenu(): void {
  openDrawer()
}

onMounted(() => {
  // Handle query params
  if (route.query.date) {
    dateFilter.value = route.query.date as OrderDateFilter
  }
  if (route.query.status) {
    statusFilter.value = route.query.status as OrderStatus | 'All'
  }
  fetchOrders()
})

onIonViewWillEnter(() => {
  if (filteredOrders.value.length > 0) refresh()
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
  --background: transparent;
  --background-activated: transparent;
  --background-hover: transparent;
  --box-shadow: none;
  --padding-start: 8px;
  --padding-end: 8px;
  --color: var(--color-text);
}

.header-icon { font-size: 22px; }

.filters-container {
  background: var(--color-background);
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.date-filters {
  --background: var(--color-surface);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

ion-segment {
  --background: var(--color-surface);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
}

.filter-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none; /* Hide scrollbar for Firefox */
}

.filter-chips::-webkit-scrollbar {
  display: none; /* Hide scrollbar for Chrome/Safari */
}

.filter-chip {
  padding: 6px 16px;
  border-radius: 100px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-muted);
  white-space: nowrap;
  transition: all 0.2s ease;
  cursor: pointer;
}

.filter-chip--active {
  background: var(--color-primary-light, #f0f4ff);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.orders-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 64px 32px;
  text-align: center;
  animation: fade-in 0.3s ease both;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.orders-empty__icon {
  font-size: 48px;
  color: var(--color-text-muted);
  margin-bottom: 8px;
}

.orders-empty__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text);
}

.orders-empty__text {
  margin: 0;
  font-size: var(--font-size-base);
  color: var(--color-text-muted);
}

.orders-error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 16px 0;
  padding: 10px 14px;
  background: var(--color-error-bg);
  color: var(--color-error-text);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-sm);
  font-weight: 500;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
