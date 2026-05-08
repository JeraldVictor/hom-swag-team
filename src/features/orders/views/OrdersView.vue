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

      <!-- Loading skeleton -->
      <template v-if="isLoading && orders.length === 0">
        <div class="orders-list">
          <div v-for="n in 4" :key="n" class="order-skeleton">
            <div class="order-skeleton__header" />
            <div class="order-skeleton__body" />
            <div class="order-skeleton__footer" />
          </div>
        </div>
      </template>

      <!-- Error state -->
      <template v-else-if="error && orders.length === 0">
        <div class="orders-empty">
          <Icon icon="lucide:wifi-off" class="orders-empty__icon" aria-hidden="true" />
          <p class="orders-empty__title">Could not load orders</p>
          <p class="orders-empty__text">{{ error }}</p>
          <ion-button fill="outline" size="small" @click="fetchOrders()">Retry</ion-button>
        </div>
      </template>

      <!-- Empty state -->
      <template v-else-if="!isLoading && orders.length === 0">
        <div class="orders-empty">
          <Icon icon="lucide:briefcase" class="orders-empty__icon" aria-hidden="true" />
          <p class="orders-empty__title">No orders yet</p>
          <p class="orders-empty__text">Your assigned orders will appear here.</p>
        </div>
      </template>

      <!-- Orders list -->
      <template v-else>
        <div v-if="error" class="orders-error-banner" role="alert">
          <Icon icon="lucide:alert-circle" aria-hidden="true" />
          {{ error }}
        </div>
        <div class="orders-list anim-list">
          <OrderCard
            v-for="order in orders"
            :key="order.id ?? order._id"
            :order="(order as Order)"
            @click="goToDetail(order.id ?? order._id ?? '')"
          />
        </div>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
  IonRefresher, IonRefresherContent, onIonViewWillEnter,
} from '@ionic/vue'
import { Icon } from '@iconify/vue'
import { useOrders } from '../composables/useOrders'
import OrderCard from '../components/OrderCard.vue'
import type { Order } from '@/shared/models'
import { useDrawer } from '@/shared/composables'

const router = useRouter()
const { orders, isLoading, error, fetchOrders, refresh } = useOrders()
const { openDrawer } = useDrawer()

function openMenu(): void {
  openDrawer()
}

onMounted(() => fetchOrders())
onIonViewWillEnter(() => {
  if (orders.value.length > 0) fetchOrders()
})

async function handleRefresh(event: CustomEvent): Promise<void> {
  await refresh()
  ;(event.target as HTMLIonRefresherElement).complete()
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

/* Skeleton */
.order-skeleton {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-skeleton__header,
.order-skeleton__body,
.order-skeleton__footer {
  border-radius: var(--radius-md);
  background: linear-gradient(90deg, var(--color-border) 25%, var(--color-background) 50%, var(--color-border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.order-skeleton__header { height: 20px; width: 45%; }
.order-skeleton__body   { height: 48px; }
.order-skeleton__footer { height: 16px; width: 60%; }

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
