<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/home" />
        </ion-buttons>
        <ion-title>Trip Fees Report</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <!-- Filters -->
      <section class="filters-panel">
        <button
          type="button"
          class="filters-toggle"
          :aria-expanded="showFilters"
          @click="showFilters = !showFilters"
        >
          <span class="filters-toggle__left">
            <Icon icon="lucide:sliders-horizontal" aria-hidden="true" />
            <span>
              <span class="filters-toggle__label">Filters</span>
              <span class="filters-toggle__summary">{{ filterSummary }}</span>
            </span>
          </span>
          <Icon
            icon="lucide:chevron-down"
            class="filters-toggle__chevron"
            :class="{ 'filters-toggle__chevron--open': showFilters }"
            aria-hidden="true"
          />
        </button>

        <template v-if="showFilters">
          <div class="filter-row">
            <div class="filter-field">
              <label class="filter-label">From</label>
              <input v-model="fromDate" type="date" class="filter-input" :max="toDate" @change="fetchReport" />
            </div>
            <div class="filter-field">
              <label class="filter-label">To</label>
              <input v-model="toDate" type="date" class="filter-input" :min="fromDate" :max="todayStr" @change="fetchReport" />
            </div>
          </div>
          <div class="search-row">
            <div class="filter-field">
              <label class="filter-label">Search</label>
              <div class="search-box">
                <Icon icon="lucide:search" class="search-box__icon" aria-hidden="true" />
                <input
                  v-model="searchQuery"
                  type="search"
                  class="search-input"
                  placeholder="Trip ID, status, date"
                  @input="scheduleFetchReport"
                />
                <button
                  v-if="searchQuery"
                  type="button"
                  class="search-box__clear"
                  aria-label="Clear search"
                  @click="clearSearch"
                >
                  <Icon icon="lucide:x" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </template>
      </section>

      <!-- Loading skeleton -->
      <template v-if="isLoading">
        <div class="summary-skeleton" />
        <div class="list">
          <div v-for="n in 4" :key="n" class="entry-skeleton" />
        </div>
      </template>

      <!-- Error state -->
      <template v-else-if="error">
        <div class="empty-state">
          <Icon icon="lucide:wifi-off" class="empty-state__icon" aria-hidden="true" />
          <p class="empty-state__title">Could not load report</p>
          <p class="empty-state__text">{{ error }}</p>
          <ion-button fill="outline" size="small" @click="fetchReport">Retry</ion-button>
        </div>
      </template>

      <!-- Report content -->
      <template v-else-if="report">
        <!-- Summary card -->
        <div class="summary-card">
          <p class="summary-card__period">{{ report.period_label }}</p>
          <div class="summary-row">
            <div class="summary-item">
              <p class="summary-item__label">Trips</p>
              <p class="summary-item__value">{{ report.total_trips }}</p>
            </div>
            <div class="summary-divider" />
            <div class="summary-item">
              <p class="summary-item__label">Total Fare</p>
              <p class="summary-item__value">{{ formatCurrency(report.total_fare) }}</p>
            </div>
            <div class="summary-divider" />
            <div class="summary-item">
              <p class="summary-item__label">Trip Commission</p>
              <p class="summary-item__value summary-item__value--deduction">
                {{ formatCurrency(report.total_commission) }}
              </p>
            </div>
          </div>
          <div class="summary-net">
            <span class="summary-net__label">Petrol Payable</span>
            <span class="summary-net__amount">{{ formatCurrency(report.total_net) }}</span>
          </div>
        </div>

        <!-- Empty entries -->
        <div v-if="report.entries.length === 0" class="empty-state">
          <Icon icon="lucide:route" class="empty-state__icon" aria-hidden="true" />
          <p class="empty-state__title">No trips in this period</p>
          <p class="empty-state__text">Adjust the date range to see your trip fees.</p>
        </div>

        <!-- Trip entries -->
        <div v-else class="list">
          <div
            v-for="entry in report.entries"
            :key="entry.trip_id"
            class="entry-card"
            role="button"
            tabindex="0"
            @click="openTrip(entry)"
            @keyup.enter="openTrip(entry)"
            @keyup.space="openTrip(entry)"
          >
            <div class="entry-card__header">
              <div>
                <p class="entry-card__trip">#{{ entry.trip_number }}</p>
                <p class="entry-card__date">{{ formatDate(entry.date) }}</p>
              </div>
              <AppBadge
                :text="entry.status === 'paid' ? 'Paid' : 'Pending'"
                :variant="entry.status === 'paid' ? 'success' : 'warning'"
                size="sm"
              />
            </div>
            <div class="entry-card__amounts">
              <div class="entry-amount">
                <span class="entry-amount__label">Fare</span>
                <span class="entry-amount__value">{{ formatCurrency(entry.fare) }}</span>
              </div>
              <div class="entry-amount">
                <span class="entry-amount__label">Commission</span>
                <span class="entry-amount__value">{{ formatCurrency(entry.commission) }}</span>
              </div>
              <div class="entry-amount entry-amount--net">
                <span class="entry-amount__label">Petrol</span>
                <span class="entry-amount__value entry-amount__value--net">
                  {{ formatCurrency(entry.net_amount) }}
                </span>
              </div>
            </div>
            <p v-if="entry.distance_km != null" class="entry-card__distance">
              <Icon icon="lucide:route" aria-hidden="true" />
              {{ formatKm(entry.distance_km) }} km
              <span class="entry-card__distance-breakdown">
                {{ distanceBreakdown(entry) }}
              </span>
            </p>
          </div>
        </div>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onIonViewWillEnter } from '@ionic/vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getTripFeesReport } from '@/shared/api'
import type { TripFeeEntry, TripFeesReport } from '@/shared/models'

const router = useRouter()
const report = ref<TripFeesReport | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

const todayStr = new Date().toISOString().split('T')[0]
const startOfWeek = new Date()
const dayOfWeek = startOfWeek.getDay()
const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
startOfWeek.setDate(startOfWeek.getDate() - daysSinceMonday)
const fromDate = ref(startOfWeek.toISOString().split('T')[0])
const toDate = ref(todayStr)
const searchQuery = ref('')
const showFilters = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | undefined

const filterSummary = computed(() => {
  const range = `${formatDate(fromDate.value)} - ${formatDate(toDate.value)}`
  return searchQuery.value.trim() ? `${range} · ${searchQuery.value.trim()}` : range
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`
}

function formatKm(km: number): string {
  return km.toFixed(1)
}

function distanceBreakdown(entry: TripFeeEntry): string {
  const autoKm = entry.auto_distance_km ?? 0
  const extraKm = entry.extra_km ?? 0
  const multiplier = entry.is_two_way ? 2 : 1
  const parts = [`auto ${formatKm(autoKm)}${multiplier > 1 ? ' x2' : ''}`]
  if (extraKm > 0) parts.push(`extra ${formatKm(extraKm)}`)
  return `(${parts.join(' + ')})`
}

function scheduleFetchReport(): void {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    fetchReport()
  }, 300)
}

function clearSearch(): void {
  searchQuery.value = ''
  fetchReport()
}

function openTrip(entry: TripFeeEntry): void {
  router.push(`/trips/${entry.trip_id}`)
}

async function fetchReport(): Promise<void> {
  isLoading.value = true
  error.value = null
  try {
    report.value = await getTripFeesReport({
      from_date: fromDate.value,
      to_date: toDate.value,
      q: searchQuery.value.trim() || undefined,
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load report'
  } finally {
    isLoading.value = false
  }
}

async function handleRefresh(event: CustomEvent): Promise<void> {
  await fetchReport()
  ;(event.target as HTMLIonRefresherElement).complete()
}

onMounted(fetchReport)
onIonViewWillEnter(() => {
  if (!report.value) fetchReport()
})
</script>

<style scoped>
/* Filters */
.filters-panel {
  padding: 14px 16px 0;
}

.filters-toggle {
  width: 100%;
  min-height: 58px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  color: var(--color-text);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  text-align: left;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.filters-toggle__left {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.filters-toggle__left > svg {
  flex: 0 0 auto;
  font-size: 20px;
  color: var(--color-brand);
}

.filters-toggle__label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: 800;
  color: var(--color-text);
}

.filters-toggle__summary {
  display: block;
  margin-top: 2px;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.filters-toggle__chevron {
  flex: 0 0 auto;
  font-size: 20px;
  color: var(--color-text-muted);
  transition: transform 0.16s ease;
}

.filters-toggle__chevron--open {
  transform: rotate(180deg);
}

.filter-row {
  display: flex;
  gap: 12px;
  padding-top: 12px;
}

.filter-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-label {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.filter-input {
  padding: 8px 10px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-sm);
  color: var(--color-text);
  background: var(--color-surface);
  outline: none;
  font-family: inherit;
}

.filter-input:focus { border-color: var(--color-brand); }

.search-row {
  padding-top: 10px;
}

.search-box {
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.search-box:focus-within { border-color: var(--color-brand); }

.search-box__icon {
  flex: 0 0 auto;
  font-size: 18px;
  color: var(--color-text-muted);
}

.search-input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-size: var(--font-size-sm);
}

.search-box__clear {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: var(--color-background);
  color: var(--color-text-muted);
}

/* Summary card */
.summary-card {
  margin: 16px;
  background: linear-gradient(135deg, var(--color-brand) 0%, var(--color-hero-dark) 100%);
  border-radius: var(--radius-xl);
  padding: 16px;
  color: #fff;
}

.summary-card__period {
  margin: 0 0 12px;
  font-size: var(--font-size-sm);
  font-weight: 600;
  opacity: 0.8;
}

.summary-row {
  display: flex;
  align-items: stretch;
  gap: 0;
  margin-bottom: 14px;
}

.summary-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.summary-divider {
  width: 1px;
  background: rgba(255,255,255,0.25);
  margin: 0 4px;
}

.summary-item__label {
  margin: 0;
  font-size: var(--font-size-xs);
  opacity: 0.75;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.summary-item__value {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 800;
  color: #fff;
}

.summary-item__value--deduction { color: #fca5a5; }

.summary-net {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.25);
}

.summary-net__label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  opacity: 0.85;
}

.summary-net__amount {
  font-size: var(--font-size-2xl);
  font-weight: 800;
  color: #fff;
}

/* List */
.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 16px 16px;
}

.entry-card {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  cursor: pointer;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;
}

.entry-card:active {
  transform: scale(0.99);
}

.entry-card:focus-visible {
  border-color: var(--color-brand);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-brand) 18%, transparent);
  outline: none;
}

.entry-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.entry-card__trip {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text);
}

.entry-card__date {
  margin: 2px 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.entry-card__amounts {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.entry-amount {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.entry-amount--net {
  margin-left: auto;
}

.entry-amount__label {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.entry-amount__value {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text);
}

.entry-amount__value--deduction { color: var(--color-error-text); }
.entry-amount__value--net { color: var(--color-success-text); font-size: var(--font-size-lg); }

.entry-card__distance {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.entry-card__distance-breakdown {
  min-width: 0;
  color: var(--color-text-muted);
}

/* Skeletons */
.summary-skeleton {
  height: 140px;
  margin: 16px;
  border-radius: var(--radius-xl);
  background: linear-gradient(90deg, var(--color-border) 25%, var(--color-background) 50%, var(--color-border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.entry-skeleton {
  height: 80px;
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
