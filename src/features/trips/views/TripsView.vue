<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button class="header-icon-btn" aria-label="Open menu" @click="openMenu">
            <Icon icon="lucide:menu" class="header-icon" />
          </ion-button>
        </ion-buttons>
        <ion-title>Trips</ion-title>
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
              :key="status.value"
              class="filter-chip"
              :class="{ 'filter-chip--active': statusFilter === status.value }"
              @click="statusFilter = status.value"
            >
              {{ status.label }}
            </div>
          </div>
        </div>
      </div>

      <!-- Loading skeleton -->
      <template v-if="isLoading && trips.length === 0">
        <div class="trips-list">
          <div v-for="n in 4" :key="n" class="trip-skeleton">
            <div class="trip-skeleton__header" />
            <div class="trip-skeleton__body" />
            <div class="trip-skeleton__footer" />
          </div>
        </div>
      </template>

      <!-- Error state -->
      <template v-else-if="error && trips.length === 0">
        <div class="empty-state">
          <Icon icon="lucide:wifi-off" class="empty-icon" />
          <h3>Could not load trips</h3>
          <p>{{ error }}</p>
          <ion-button fill="outline" class="retry-btn" @click="fetchTrips(true)">
            Retry
          </ion-button>
        </div>
      </template>

      <!-- Empty state -->
      <template v-else-if="!isLoading && trips.length === 0">
        <div class="empty-state">
          <div class="empty-icon-wrapper">
            <Icon icon="lucide:car" class="empty-icon" />
          </div>
          <h3>No trips found</h3>
          <p>No trips match your current filters.</p>
        </div>
      </template>

      <!-- List -->
      <template v-else>
        <div v-if="error" class="trips-error-banner" role="alert">
          <Icon icon="lucide:alert-circle" aria-hidden="true" />
          {{ error }}
        </div>
        
        <div class="trips-list anim-list">
          <TripCard
            v-for="trip in trips"
            :key="trip.id"
            :trip="trip"
            @click="goToDetail(trip.id)"
          />
        </div>

        <!-- Infinite Scroll -->
        <ion-infinite-scroll @ionInfinite="onIonInfinite" :disabled="!hasMore">
          <ion-infinite-scroll-content
            loading-spinner="crescent"
            loading-text="Loading more trips..."
          />
        </ion-infinite-scroll>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  onIonViewWillEnter,
} from '@ionic/vue'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useDrawer } from '@/shared/composables'
import { useTrips } from '../composables/useTrips'
import TripCard from '../components/TripCard.vue'
import type { TripKanbanState } from '@/shared/models/trip.model'

const router = useRouter()
const { trips, isLoading, error, fetchTrips, dateFilter, statusFilter, hasMore, loadMoreTrips } =
  useTrips()
const { openDrawer } = useDrawer()

const statusOptions: { value: TripKanbanState; label: string }[] = [
  { value: 'assigned', label: 'Assigned' },
  { value: 'trip_started', label: 'Started' },
  { value: 'dropped_and_waiting', label: 'Waiting' },
  { value: 'completed', label: 'Completed' },
]

function openMenu(): void {
  openDrawer()
}

onMounted(() => {
  if (trips.value.length === 0) {
    fetchTrips(true)
  }
})

onIonViewWillEnter(() => {
  if (trips.value.length > 0) {
    fetchTrips(true)
  }
})

async function handleRefresh(event: CustomEvent): Promise<void> {
  await fetchTrips(true)
  ;(event.target as HTMLIonRefresherElement).complete()
}

async function onIonInfinite(event: CustomEvent) {
  await loadMoreTrips()
  ;(event.target as HTMLIonInfiniteScrollElement).complete()
}

function goToDetail(id: string | number): void {
  router.push(`/trips/${id}`)
}
</script>

<style scoped>
/* ── Header ─────────────────────────────────────────────────────────────── */
ion-header {
  background: var(--color-background);
}
ion-toolbar {
  --background: transparent;
  --border-color: transparent;
  padding: 4px 8px;
}
.header-icon-btn {
  --padding-start: 8px;
  --padding-end: 8px;
  --color: var(--color-text);
  margin-right: 8px;
}
.header-icon {
  font-size: 24px;
}

/* ── Filters Container ─────────────────────────────────────────────────── */
.filters-container {
  background: var(--color-surface);
  padding: 12px 16px 16px;
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 10;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: rgba(255, 255, 255, 0.85); /* Light mode fallback */
}

@media (prefers-color-scheme: dark) {
  .filters-container {
    background: rgba(30, 30, 30, 0.85);
  }
}

.date-filters {
  margin-bottom: 16px;
}
ion-segment {
  background: var(--color-background);
  border-radius: var(--radius-lg);
  padding: 4px;
}
ion-segment-button {
  --color: var(--color-text-muted);
  --color-checked: var(--color-text);
  --indicator-color: var(--color-surface);
  --border-radius: var(--radius-md);
  margin: 0;
  min-height: 36px;
  font-weight: 600;
  font-size: var(--font-size-sm);
  letter-spacing: -0.01em;
}

.status-filters {
  overflow-x: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
  margin: 0 -16px;
  padding: 0 16px;
}
.status-filters::-webkit-scrollbar {
  display: none;
}

.filter-chips {
  display: inline-flex;
  gap: 8px;
  padding-bottom: 4px;
}

.filter-chip {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  background: var(--color-background);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.filter-chip--active {
  background: var(--color-text);
  color: var(--color-surface);
  border-color: var(--color-text);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

/* ── Content Area ──────────────────────────────────────────────────────── */
.trips-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

/* Empty States */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 64px 24px;
  animation: fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.empty-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--color-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.04);
}

.empty-icon {
  font-size: 40px;
  color: var(--color-text-muted);
}

.empty-state h3 {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 8px 0;
  letter-spacing: -0.02em;
}

.empty-state p {
  font-size: 15px;
  color: var(--color-text-muted);
  margin: 0 0 24px 0;
  max-width: 260px;
  line-height: 1.5;
}

.retry-btn {
  --border-radius: var(--radius-lg);
  --border-width: 1.5px;
  --color: var(--color-text);
  --border-color: var(--color-border);
  font-weight: 600;
  letter-spacing: -0.01em;
}

/* ── Skeleton ──────────────────────────────────────────────────────────── */
.trip-skeleton {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}

.trip-skeleton__header,
.trip-skeleton__body,
.trip-skeleton__footer {
  border-radius: var(--radius-md);
  background: linear-gradient(90deg, var(--color-border) 25%, var(--color-background) 50%, var(--color-border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite linear;
}

.trip-skeleton__header { height: 24px; width: 45%; }
.trip-skeleton__body { height: 72px; width: 100%; border-radius: var(--radius-lg); }
.trip-skeleton__footer { height: 20px; width: 65%; }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes fade-in-up {
  0% { opacity: 0; transform: translateY(16px); }
  100% { opacity: 1; transform: translateY(0); }
}

.trips-error-banner {
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
</style>
