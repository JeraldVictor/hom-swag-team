<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/home" />
        </ion-buttons>
        <ion-title>Leaderboard</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <!-- Period selector -->
      <div class="period-tabs">
        <button
          v-for="p in periods"
          :key="p.value"
          class="period-tab"
          :class="{ 'period-tab--active': selectedPeriod === p.value }"
          @click="changePeriod(p.value)"
        >
          {{ p.label }}
        </button>
      </div>

      <!-- Loading skeleton -->
      <template v-if="isLoading">
        <div class="podium-skeleton" />
        <div class="list">
          <div v-for="n in 5" :key="n" class="entry-skeleton" />
        </div>
      </template>

      <!-- Error state -->
      <template v-else-if="error">
        <div class="empty-state">
          <Icon icon="lucide:wifi-off" class="empty-state__icon" aria-hidden="true" />
          <p class="empty-state__title">Could not load leaderboard</p>
          <p class="empty-state__text">{{ error }}</p>
          <ion-button fill="outline" size="small" @click="fetchLeaderboard">Retry</ion-button>
        </div>
      </template>

      <!-- Leaderboard content -->
      <template v-else-if="data">
        <!-- Restriction notice for riders -->
        <div v-if="data.is_restricted" class="restriction-banner">
          <Icon icon="lucide:lock" class="restriction-banner__icon" aria-hidden="true" />
          <p class="restriction-banner__text">Showing top 3 riders only.</p>
        </div>

        <!-- Podium (top 3) -->
        <div v-if="top3.length > 0" class="podium">
          <!-- 2nd place -->
          <div v-if="top3[1]" class="podium-slot podium-slot--second">
            <div class="podium-avatar podium-avatar--second">
              <img v-if="top3[1].photo_url" :src="top3[1].photo_url" :alt="top3[1].name" class="podium-avatar__img" />
              <span v-else class="podium-avatar__initials">{{ initials(top3[1].name) }}</span>
            </div>
            <p class="podium-name">{{ top3[1].name.split(' ')[0] }}</p>
            <p class="podium-count">{{ top3[1].count }}</p>
            <div class="podium-block podium-block--second">
              <span class="podium-rank">2</span>
            </div>
          </div>

          <!-- 1st place -->
          <div v-if="top3[0]" class="podium-slot podium-slot--first">
            <div class="podium-crown" aria-hidden="true">👑</div>
            <div class="podium-avatar podium-avatar--first">
              <img v-if="top3[0].photo_url" :src="top3[0].photo_url" :alt="top3[0].name" class="podium-avatar__img" />
              <span v-else class="podium-avatar__initials">{{ initials(top3[0].name) }}</span>
            </div>
            <p class="podium-name">{{ top3[0].name.split(' ')[0] }}</p>
            <p class="podium-count">{{ top3[0].count }}</p>
            <div class="podium-block podium-block--first">
              <span class="podium-rank">1</span>
            </div>
          </div>

          <!-- 3rd place -->
          <div v-if="top3[2]" class="podium-slot podium-slot--third">
            <div class="podium-avatar podium-avatar--third">
              <img v-if="top3[2].photo_url" :src="top3[2].photo_url" :alt="top3[2].name" class="podium-avatar__img" />
              <span v-else class="podium-avatar__initials">{{ initials(top3[2].name) }}</span>
            </div>
            <p class="podium-name">{{ top3[2].name.split(' ')[0] }}</p>
            <p class="podium-count">{{ top3[2].count }}</p>
            <div class="podium-block podium-block--third">
              <span class="podium-rank">3</span>
            </div>
          </div>
        </div>

        <!-- Full list (rank 4+) — only shown when not restricted -->
        <div v-if="!data.is_restricted && rest.length > 0" class="list">
          <div
            v-for="entry in rest"
            :key="entry.user_id"
            class="entry-card"
            :class="{ 'entry-card--self': entry.is_self }"
          >
            <span class="entry-rank">{{ entry.rank }}</span>
            <div class="entry-avatar">
              <img v-if="entry.photo_url" :src="entry.photo_url" :alt="entry.name" class="entry-avatar__img" />
              <span v-else class="entry-avatar__initials">{{ initials(entry.name) }}</span>
            </div>
            <div class="entry-info">
              <p class="entry-name">{{ entry.name }} <span v-if="entry.is_self" class="entry-you">(You)</span></p>
              <p class="entry-count">{{ entry.count }} {{ isBeautician ? 'orders' : 'trips' }}</p>
            </div>
            <span v-if="entry.earnings" class="entry-earnings">
              ₹{{ entry.earnings.toLocaleString('en-IN') }}
            </span>
          </div>
        </div>

        <!-- Self entry when outside top N -->
        <div v-if="data.self_entry && !data.self_entry.is_self" class="self-entry-card">
          <p class="self-entry-card__label">Your Rank</p>
          <div class="entry-card entry-card--self">
            <span class="entry-rank">{{ data.self_entry.rank }}</span>
            <div class="entry-avatar">
              <span class="entry-avatar__initials">{{ initials(data.self_entry.name) }}</span>
            </div>
            <div class="entry-info">
              <p class="entry-name">{{ data.self_entry.name }} <span class="entry-you">(You)</span></p>
              <p class="entry-count">{{ data.self_entry.count }} {{ isBeautician ? 'orders' : 'trips' }}</p>
            </div>
          </div>
        </div>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonRefresher, IonRefresherContent, IonButton,
  onIonViewWillEnter,
} from '@ionic/vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useUserTypeStore } from '@/shared/stores'
import { getLeaderboard } from '@/shared/api'
import type { LeaderboardData, LeaderboardPeriod } from '@/shared/models'

const userTypeStore = useUserTypeStore()
const { isBeautician } = storeToRefs(userTypeStore)

const data = ref<LeaderboardData | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const selectedPeriod = ref<LeaderboardPeriod>('monthly')

const periods: { value: LeaderboardPeriod; label: string }[] = [
  { value: 'weekly', label: 'This Week' },
  { value: 'monthly', label: 'This Month' },
  { value: 'all_time', label: 'All Time' },
]

const top3 = computed(() => data.value?.entries.slice(0, 3) ?? [])
const rest = computed(() => data.value?.entries.slice(3) ?? [])

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]?.toUpperCase() ?? '').join('')
}

async function fetchLeaderboard(): Promise<void> {
  isLoading.value = true
  error.value = null
  try {
    data.value = await getLeaderboard(selectedPeriod.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load leaderboard'
  } finally {
    isLoading.value = false
  }
}

async function changePeriod(period: LeaderboardPeriod): Promise<void> {
  selectedPeriod.value = period
  await fetchLeaderboard()
}

async function handleRefresh(event: CustomEvent): Promise<void> {
  await fetchLeaderboard()
  ;(event.target as HTMLIonRefresherElement).complete()
}

onMounted(fetchLeaderboard)
onIonViewWillEnter(() => {
  if (!data.value) fetchLeaderboard()
})
</script>

<style scoped>
/* Period tabs */
.period-tabs {
  display: flex;
  gap: 0;
  padding: 16px 16px 0;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.period-tab {
  flex: 1;
  padding: 10px 4px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.period-tab--active {
  color: var(--color-brand);
  border-bottom-color: var(--color-brand);
}

/* Restriction banner */
.restriction-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px 16px 0;
  padding: 10px 14px;
  background: var(--color-warning-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-warning);
}

.restriction-banner__icon { font-size: 16px; color: var(--color-warning-text); }

.restriction-banner__text {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-warning-text);
  font-weight: 500;
}

/* Podium */
.podium {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 8px;
  padding: 24px 16px 0;
}

.podium-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  max-width: 110px;
}

.podium-crown {
  font-size: 24px;
  margin-bottom: 4px;
}

.podium-avatar {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  margin-bottom: 6px;
}

.podium-avatar--first  { width: 64px; height: 64px; border-color: #FFD700; }
.podium-avatar--second { width: 52px; height: 52px; border-color: #C0C0C0; }
.podium-avatar--third  { width: 52px; height: 52px; border-color: #CD7F32; }

.podium-avatar__img { width: 100%; height: 100%; object-fit: cover; }

.podium-avatar__initials {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-brand);
}

.podium-name {
  margin: 0 0 2px;
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.podium-count {
  margin: 0 0 6px;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  text-align: center;
}

.podium-block {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.podium-block--first  { height: 72px; background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%); }
.podium-block--second { height: 52px; background: linear-gradient(180deg, #C0C0C0 0%, #A0A0A0 100%); }
.podium-block--third  { height: 40px; background: linear-gradient(180deg, #CD7F32 0%, #A0522D 100%); }

.podium-rank {
  font-size: var(--font-size-xl);
  font-weight: 800;
  color: #fff;
}

/* List */
.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
}

.entry-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 12px 14px;
}

.entry-card--self {
  border-color: var(--color-brand);
  background: var(--color-brand-pale);
}

.entry-rank {
  font-size: var(--font-size-base);
  font-weight: 800;
  color: var(--color-text-muted);
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.entry-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-background);
  border: 1.5px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.entry-avatar__img { width: 100%; height: 100%; object-fit: cover; }

.entry-avatar__initials {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-brand);
}

.entry-info { flex: 1; min-width: 0; }

.entry-name {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entry-you {
  font-size: var(--font-size-xs);
  color: var(--color-brand);
  font-weight: 700;
}

.entry-count {
  margin: 2px 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.entry-earnings {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-success-text);
  flex-shrink: 0;
}

/* Self entry card */
.self-entry-card {
  padding: 0 16px 16px;
}

.self-entry-card__label {
  margin: 0 0 8px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

/* Skeletons */
.podium-skeleton {
  height: 180px;
  margin: 16px;
  border-radius: var(--radius-xl);
  background: linear-gradient(90deg, var(--color-border) 25%, var(--color-background) 50%, var(--color-border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.entry-skeleton {
  height: 64px;
  border-radius: var(--radius-xl);
  background: linear-gradient(90deg, var(--color-border) 25%, var(--color-background) 50%, var(--color-border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 80px 32px;
  text-align: center;
}

.empty-state__icon { font-size: 52px; color: var(--color-text-muted); margin-bottom: 8px; }
.empty-state__title { margin: 0; font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text); }
.empty-state__text { margin: 0; font-size: var(--font-size-base); color: var(--color-text-muted); }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
