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

      <!-- Loading state -->
      <template v-if="isLoading && !data">
        <phantom-ui loading animation="shimmer" stagger="0.05">
          <!-- Podium Skeleton -->
          <div class="podium">
            <div class="podium-slot podium-slot--second">
              <div class="podium-avatar podium-avatar--second"></div>
              <div class="podium-block podium-block--second"></div>
            </div>
            <div class="podium-slot podium-slot--first">
              <div class="podium-avatar podium-avatar--first"></div>
              <div class="podium-block podium-block--first"></div>
            </div>
            <div class="podium-slot podium-slot--third">
              <div class="podium-avatar podium-avatar--third"></div>
              <div class="podium-block podium-block--third"></div>
            </div>
          </div>

          <!-- List Skeleton -->
          <div class="list" style="margin-top: 16px;">
            <phantom-ui loading count="5" count-gap="8">
              <div class="entry-card">
                <div class="entry-avatar"></div>
                <div class="entry-info">
                  <div style="height: 14px; width: 60%; background: #eee; margin-bottom: 4px;"></div>
                  <div style="height: 10px; width: 40%; background: #eee;"></div>
                </div>
              </div>
            </phantom-ui>
          </div>
        </phantom-ui>
      </template>


      <!-- Error state -->
      <template v-else-if="error">
        <div class="empty-state">
          <div class="empty-state__icon-wrapper empty-state__icon-wrapper--error">
            <Icon :icon="error.includes('permission') ? 'lucide:shield-alert' : 'lucide:wifi-off'" class="empty-state__icon empty-state__icon--error" aria-hidden="true" />
          </div>
          <p class="empty-state__title">{{ error.includes('permission') ? 'Access Restricted' : 'Could not load leaderboard' }}</p>
          <p class="empty-state__text">{{ error }}</p>
          <ion-button v-if="!error.includes('permission')" fill="outline" size="small" @click="fetchLeaderboard" class="ion-margin-top">Retry</ion-button>
        </div>
      </template>

      <!-- Leaderboard content -->
      <template v-else-if="data">
        <!-- Empty state / No data -->
        <template v-if="!isLoading && data && top3.length === 0">
          <div class="empty-state">
            <div class="empty-state__icon-wrapper">
              <Icon icon="lucide:trophy" class="empty-state__icon" aria-hidden="true" />
            </div>
            <p class="empty-state__title">No Data Available</p>
            <p class="empty-state__text">{{ emptyStateText }}</p>
          </div>
        </template>
        <!-- Restriction notice for riders -->
        <div v-if="data.is_restricted" class="restriction-banner">
          <Icon icon="lucide:lock" class="restriction-banner__icon" aria-hidden="true" />
          <p class="restriction-banner__text">Showing top 3 {{ rolePluralLabel }}.</p>
        </div>

        <div v-if="prizeCards.length > 0" class="prize-strip" aria-label="Leaderboard bonus prizes">
          <div v-for="prize in prizeCards" :key="prize.rank" class="prize-card">
            <span class="prize-card__rank">{{ prize.label }}</span>
            <span class="prize-card__amount">{{ formatCurrency(prize.amount) }}</span>
          </div>
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
            <div class="podium-block podium-block--third">
              <span class="podium-rank">3</span>
            </div>
          </div>
        </div>

        <!-- Compact Table view for Financial Year -->
        <div v-if="selectedPeriod === 'financial_year' && rest.length > 0" class="year-table-container">
          <table class="year-table">
            <thead>
              <tr>
                <th class="year-table__header-rank">Rank</th>
                <th class="year-table__header-name">{{ roleLabel }} Name</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="entry in rest" 
                :key="entry.user_id" 
                class="year-table__row" 
                :class="{ 'year-table__row--self': entry.is_self }"
              >
                <td class="year-table__cell-rank">{{ entry.rank }}</td>
                <td class="year-table__cell-name">
                  <div class="name-wrapper">
                    <div class="entry-avatar-small">
                      <img v-if="entry.photo_url" :src="entry.photo_url" :alt="entry.name" class="entry-avatar__img" />
                      <span v-else class="entry-avatar__initials-small">{{ initials(entry.name) }}</span>
                    </div>
                    <span class="name-text">{{ entry.name }}</span>
                    <span v-if="entry.is_self" class="entry-you-tag">YOU</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Full list (rank 4+) — for other periods or if not restricted -->
        <div v-else-if="!data.is_restricted && rest.length > 0" class="table-container">
          <!-- Table Headers -->
          <div class="table-header">
            <span class="table-header__rank">Rank</span>
            <span class="table-header__name">{{ roleLabel }}</span>
            <span class="table-header__earnings">{{ amountLabel }}</span>
          </div>
          
          <div class="list">
            <div
              v-for="entry in rest"
              :key="entry.user_id"
              class="entry-card"
              :class="{ 'entry-card--self': entry.is_self, 'entry-card--masked': entry.user_id === 'masked' }"
            >
              <span class="entry-rank">{{ entry.rank }}</span>
              <div class="entry-avatar">
                <Icon v-if="entry.user_id === 'masked'" icon="lucide:user-x" class="masked-icon" />
                <img v-else-if="entry.photo_url" :src="entry.photo_url" :alt="entry.name" class="entry-avatar__img" />
                <span v-else class="entry-avatar__initials">{{ initials(entry.name) }}</span>
              </div>
              <div class="entry-info">
                <p class="entry-name">
                  {{ entry.name }} 
                  <span v-if="entry.is_self" class="entry-you">(You)</span>
                </p>
              </div>
              <span v-if="entry.amount && !isMaskedEntry(entry)" class="entry-earnings">
                {{ formatAmount(entry.amount) }}
              </span>
              <span v-else-if="isMaskedEntry(entry)" class="entry-earnings entry-earnings--masked">—</span>
            </div>
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
            </div>
          </div>
        </div>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onIonViewWillEnter } from '@ionic/vue'
import { computed, onMounted, ref } from 'vue'
import { getLeaderboard } from '@/shared/api'
import type { LeaderboardData, LeaderboardEntry, LeaderboardPeriod } from '@/shared/models'

const data = ref<LeaderboardData | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const selectedPeriod = ref<LeaderboardPeriod>('monthly')

const periods: { value: LeaderboardPeriod; label: string }[] = [
  { value: 'weekly', label: 'This Week' },
  { value: 'monthly', label: 'This Month' },
  { value: 'financial_year', label: 'Financial Year' },
]

const top3 = computed(() => data.value?.entries.slice(0, 3) ?? [])
const rest = computed(() => data.value?.entries.slice(3) ?? [])
const isRiderLeaderboard = computed(() => data.value?.role === 'rider')
const roleLabel = computed(() => (isRiderLeaderboard.value ? 'Rider' : 'Beautician'))
const rolePluralLabel = computed(() => (isRiderLeaderboard.value ? 'Riders' : 'Beauticians'))
const amountLabel = computed(() => (isRiderLeaderboard.value ? 'Distance' : 'Revenue'))
const prizeAmounts = computed(() => {
  if (!data.value?.prizes) return []
  return isRiderLeaderboard.value
    ? (data.value.prizes.rider ?? [])
    : (data.value.prizes.beutician ?? [])
})
const prizeCards = computed(() =>
  prizeAmounts.value
    .slice(0, 2)
    .map((amount, index) => ({
      rank: index + 1,
      label: index === 0 ? '1st Bonus' : '2nd Bonus',
      amount,
    }))
    .filter(prize => prize.amount > 0)
)
const emptyStateText = computed(() =>
  isRiderLeaderboard.value
    ? 'Check back later when trips are completed.'
    : 'Check back later when orders are completed and revenue is generated.'
)

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0]?.toUpperCase() ?? '')
    .join('')
}

function formatAmount(amount: number): string {
  if (isRiderLeaderboard.value) {
    return `${amount.toLocaleString('en-IN')} km`
  }

  return formatCurrency(amount)
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`
}

function isMaskedEntry(entry: LeaderboardEntry): boolean {
  return entry.user_id === 'masked'
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

.prize-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 16px 16px 0;
}

.prize-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.prize-card__rank {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.prize-card__amount {
  font-size: var(--font-size-lg);
  font-weight: 800;
  color: var(--color-success-text);
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
  padding: 0 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.table-header {
  display: flex;
  align-items: center;
  padding: 0 24px 8px 32px;
  margin-top: 16px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.table-header__rank {
  width: 32px;
  text-align: center;
  margin-right: 12px;
}

.table-header__name {
  flex: 1;
}

.table-header__earnings {
  text-align: right;
  padding-left: 8px;
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

.entry-earnings {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-success-text);
  flex-shrink: 0;
}

.entry-earnings--masked {
  color: var(--color-text-muted);
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

/* Skeletons removed - using phantom-ui */

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 32px;
  text-align: center;
  margin: 24px 16px;
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
  position: relative;
  overflow: hidden;
}

.empty-state::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--color-brand), var(--color-brand-pale));
}

.empty-state__icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--color-brand-pale);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  box-shadow: inset 0 0 0 4px rgba(255,255,255,0.5);
  animation: float 3s ease-in-out infinite;
}

.empty-state__icon-wrapper--error {
  background: var(--color-error-bg);
}

.empty-state__icon { 
  font-size: 36px; 
  color: var(--color-brand); 
}

.empty-state__icon--error {
  color: var(--color-error);
}

.empty-state__title { 
  margin: 0; 
  font-size: 20px; 
  font-weight: 800; 
  color: var(--color-text); 
  letter-spacing: -0.3px;
}

.empty-state__text { 
  margin: 0; 
  font-size: 15px; 
  color: var(--color-text-muted); 
  line-height: 1.5;
}

@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
  100% { transform: translateY(0px); }
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Year Table Styles */
.year-table-container {
  padding: 0 16px 24px;
  margin-top: 16px;
}

.year-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  overflow: hidden;
  border: 1px solid var(--color-border);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
}

.year-table th {
  background: var(--color-background);
  padding: 12px 16px;
  text-align: left;
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--color-border);
}

.year-table__header-rank {
  width: 60px;
  text-align: center !important;
}

.year-table__row {
  transition: background-color 0.2s ease;
}

.year-table__row:not(:last-child) .year-table__cell-rank,
.year-table__row:not(:last-child) .year-table__cell-name {
  border-bottom: 1px solid var(--color-border);
}

.year-table__row--self {
  background-color: var(--color-brand-pale);
}

.year-table__cell-rank {
  padding: 14px 16px;
  text-align: center;
  font-weight: 800;
  color: var(--color-text-muted);
  font-size: var(--font-size-base);
}

.year-table__cell-name {
  padding: 14px 16px;
}

.name-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.name-text {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
}

.entry-avatar-small {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.entry-avatar__initials-small {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-brand);
}

.entry-you-tag {
  font-size: 10px;
  font-weight: 800;
  background: var(--color-brand);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 4px;
}
</style>
