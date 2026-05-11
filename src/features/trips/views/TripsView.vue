<template>
  <ion-page>
    <ion-header :translucent="true">
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
      <!-- Pull-to-refresh -->
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <!-- Loading skeleton — only on first load with no data yet -->
      <template v-if="isLoading && trips.length === 0">
        <div class="trips-list">
          <div v-for="n in 4" :key="n" class="trip-skeleton">
            <div class="trip-skeleton__header" />
            <div class="trip-skeleton__body" />
            <div class="trip-skeleton__footer" />
          </div>
        </div>
      </template>

      <!-- Error state — API failed and no cached data -->
      <template v-else-if="error && trips.length === 0">
        <div class="trips-empty">
          <Icon icon="lucide:wifi-off" class="trips-empty__icon" aria-hidden="true" />
          <p class="trips-empty__title">Could not load trips</p>
          <p class="trips-empty__text">{{ error }}</p>
          <ion-button fill="outline" size="small" @click="fetchTrips()">Retry</ion-button>
        </div>
      </template>

      <!-- Empty state — loaded successfully but no trips assigned -->
      <template v-else-if="!isLoading && trips.length === 0">
        <div class="trips-empty">
          <Icon icon="lucide:car" class="trips-empty__icon" aria-hidden="true" />
          <p class="trips-empty__title">No trips yet</p>
          <p class="trips-empty__text">Your assigned trips will appear here.</p>
        </div>
      </template>

      <!-- Trip list -->
      <template v-else>
        <!-- Inline error banner during refresh (data still visible) -->
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
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onIonViewWillEnter } from '@ionic/vue'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDrawer } from '@/shared/composables'
import { useTrips } from '../composables/useTrips'

const router = useRouter()
const { trips, isLoading, error, fetchTrips, refresh } = useTrips()
const { openDrawer } = useDrawer()

function openMenu(): void {
  openDrawer()
}

// onMounted fires once on first render.
// onIonViewWillEnter fires every time the tab becomes active (back navigation, tab switch).
// Both are needed: onMounted for initial load, onIonViewWillEnter for re-entry.
onMounted(() => fetchTrips())
onIonViewWillEnter(() => {
  // Only re-fetch on re-entry if we already have data (avoids double-fetch on first load)
  if (trips.value.length > 0) fetchTrips()
})

async function handleRefresh(event: CustomEvent): Promise<void> {
  await refresh()
  ;(event.target as HTMLIonRefresherElement).complete()
}

function goToDetail(id: string | number): void {
  router.push(`/trips/${id}`)
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

.trips-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

/* ── Empty / error state ─────────────────────────────────────────────────── */

.trips-empty {
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

.trips-empty__icon {
  font-size: 48px;
  color: var(--color-text-muted);
  margin-bottom: 8px;
}

.trips-empty__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text);
}

.trips-empty__text {
  margin: 0;
  font-size: var(--font-size-base);
  color: var(--color-text-muted);
}

/* ── Inline error banner (shown during refresh when data exists) ─────────── */

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

/* ── Skeleton ────────────────────────────────────────────────────────────── */

.trip-skeleton {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.trip-skeleton__header,
.trip-skeleton__body,
.trip-skeleton__footer {
  border-radius: var(--radius-md);
  background: linear-gradient(90deg, var(--color-border) 25%, var(--color-background) 50%, var(--color-border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.trip-skeleton__header {
  height: 22px;
  width: 40%;
}

.trip-skeleton__body {
  height: 56px;
}

.trip-skeleton__footer {
  height: 18px;
  width: 60%;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
