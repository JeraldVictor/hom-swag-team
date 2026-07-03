<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/home" />
        </ion-buttons>
        <ion-title>Monthly Target</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <template v-if="isLoading && !details">
        <div class="hero-skeleton" />
        <div class="grid-skeleton" />
        <div class="list">
          <div v-for="n in 4" :key="n" class="row-skeleton" />
        </div>
      </template>

      <template v-else-if="error">
        <div class="empty-state">
          <Icon icon="lucide:wifi-off" class="empty-state__icon" aria-hidden="true" />
          <p class="empty-state__title">Could not load target details</p>
          <p class="empty-state__text">{{ error }}</p>
          <ion-button fill="outline" size="small" @click="fetchDetails">Retry</ion-button>
        </div>
      </template>

      <template v-else-if="details">
        <section class="filters-card">
          <div class="filter-field">
            <label for="target-month">Month</label>
            <input id="target-month" v-model="selectedMonth" type="month" />
          </div>
          <button class="filter-apply" type="button" :disabled="isLoading" @click="fetchDetails">
            <Icon icon="lucide:search" />
            Apply
          </button>
        </section>

        <section class="target-hero">
          <p class="target-hero__period">{{ details.period.label }}</p>
          <div class="target-hero__amounts">
            <div>
              <span>Achieved</span>
              <strong>{{ formatCurrency(details.targets.achieved_revenue) }}</strong>
            </div>
            <div>
              <span>{{ isRider ? 'Trips' : 'Target 1' }}</span>
              <strong>{{ isRider ? details.summary.trips_completed : formatCurrency(details.targets.target1) }}</strong>
            </div>
          </div>
          <div v-if="!isRider" class="progress-bar">
            <div class="progress-fill" :style="{ width: `${target1Progress}%` }" />
          </div>
        </section>

        <section class="target-grid">
          <div v-if="!isRider" class="info-card">
            <span>Target 1</span>
            <strong>{{ details.targets.target1_achieved ? 'Achieved' : 'In Progress' }}</strong>
            <small>General commission unlock</small>
          </div>
          <div v-if="!isRider" class="info-card">
            <span>Target 2</span>
            <strong>{{ formatCurrency(details.targets.target2) }}</strong>
            <small>Bonus {{ formatCurrency(details.targets.target2_bonus_amount) }}</small>
          </div>
          <div class="info-card">
            <span>{{ isRider ? 'Trips' : 'Orders' }}</span>
            <strong>{{ isRider ? details.summary.trips_completed : details.summary.orders_completed }}</strong>
            <small>{{ isRider ? 'Completed this month' : 'Completed this month' }}</small>
          </div>
          <div v-if="isRider" class="info-card">
            <span>Distance</span>
            <strong>{{ details.summary.total_trip_distance_km.toFixed(1) }} km</strong>
            <small>Payable distance</small>
          </div>
          <div class="info-card">
            <span>Leaderboard</span>
            <strong>{{ details.leaderboard.rank ? `#${details.leaderboard.rank}` : '-' }}</strong>
            <small>{{ isRider ? 'Weekly Bonus' : 'Bonus' }} {{ formatCurrency(details.leaderboard.bonus) }}</small>
          </div>
        </section>

        <section class="summary-card">
          <template v-if="isRider">
            <div class="summary-row">
              <span>Trip Commission</span>
              <strong>{{ formatCurrency(details.summary.total_general_commission) }}</strong>
            </div>
            <div class="summary-row">
              <span>Petrol Commission</span>
              <strong>{{ formatCurrency(details.summary.total_petrol_commission) }}</strong>
            </div>
            <div class="summary-row">
              <span>Weekly Commission</span>
              <strong>{{ formatCurrency(details.summary.total_weekly_commission) }}</strong>
            </div>
          </template>
          <template v-else>
            <div class="summary-row">
            <span>Special Commission</span>
            <strong>{{ formatCurrency(details.summary.total_special_commission) }}</strong>
            </div>
            <div class="summary-row">
            <span>General Commission</span>
            <strong>{{ formatCurrency(details.summary.total_general_commission) }}</strong>
            </div>
            <div class="summary-row">
            <span>Payable General</span>
            <strong>{{ formatCurrency(details.summary.payable_general_commission) }}</strong>
            </div>
            <div class="summary-row">
            <span>Upgrade/Add-on</span>
            <strong>{{ formatCurrency(details.summary.total_upgrade_addon_commission) }}</strong>
            </div>
          </template>
          <div class="summary-row summary-row--total">
            <span>Total Payable Commission</span>
            <strong>{{ formatCurrency(details.summary.final_payable_amount) }}</strong>
          </div>
          <template v-if="!isRider">
            <div class="summary-row summary-row--estimate">
              <span>Expected if Target 1 achieved</span>
              <strong>{{ formatCurrency(details.summary.expected_if_target1_achieved) }}</strong>
            </div>
            <div class="summary-row summary-row--estimate">
              <span>Expected if Target 2 achieved</span>
              <strong>{{ formatCurrency(details.summary.expected_if_target2_achieved) }}</strong>
            </div>
          </template>
        </section>

        <section v-if="details.leaderboard.prizes.length > 0" class="prize-card">
          <p class="section-label">Leaderboard Prizes</p>
          <div class="prize-row" v-for="(amount, index) in details.leaderboard.prizes" :key="index">
            <span>{{ index + 1 }}{{ rankSuffix(index + 1) }} Place</span>
            <strong>{{ formatCurrency(amount) }}</strong>
          </div>
        </section>

        <section v-if="!isRider" class="orders-section">
          <p class="section-label">Completed Orders</p>
          <div v-if="details.orders.length === 0" class="empty-inline">
            No completed orders for this month.
          </div>
          <div v-else class="list">
            <article
              v-for="order in details.orders"
              :key="order.id"
              class="order-card order-card--clickable"
              role="button"
              tabindex="0"
              @click="openOrder(order.id)"
              @keydown.enter.prevent="openOrder(order.id)"
              @keydown.space.prevent="openOrder(order.id)"
            >
              <div class="order-card__head">
                <div>
                  <p class="order-card__number">#{{ order.order_number ?? order.id.slice(-6) }}</p>
                </div>
                <strong>{{ formatCurrency(order.order_cost) }}</strong>
              </div>
              <div class="commission-grid">
                <span>Special <b>{{ formatCurrency(order.special_commission) }}</b></span>
                <span>General <b>{{ formatCurrency(order.general_commission) }}</b></span>
                <span>Upgrade <b>{{ formatCurrency(order.upgrade_addon_commission) }}</b></span>
                <span>Total <b>{{ formatCurrency(order.commission) }}</b></span>
              </div>
            </article>
          </div>
        </section>

        <section v-else class="orders-section">
          <p class="section-label">Completed Trips</p>
          <div v-if="details.trips.length === 0" class="empty-inline">
            No completed trips for this month.
          </div>
          <div v-else class="list">
            <article v-for="trip in details.trips" :key="trip.id" class="order-card">
              <div class="order-card__head">
                <div>
                  <p class="order-card__number">#{{ trip.trip_number ?? trip.id.slice(-6) }}</p>
                  <p class="order-card__customer">{{ formatDate(trip.service_date) }}</p>
                </div>
                <strong>{{ trip.distance_km.toFixed(1) }} km</strong>
              </div>
              <div class="commission-grid">
                <span>Commission <b>{{ formatCurrency(trip.commission) }}</b></span>
                <span>Petrol <b>{{ formatCurrency(trip.petrol_commission) }}</b></span>
                <span>Weekly <b>{{ formatCurrency(trip.weekly_commission) }}</b></span>
                <span>Total <b>{{ formatCurrency(trip.commission + trip.petrol_commission + trip.weekly_commission) }}</b></span>
              </div>
            </article>
          </div>
        </section>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onIonViewWillEnter } from '@ionic/vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getTargetDetails } from '@/shared/api'
import type { TargetDetailsData } from '@/shared/models'

const router = useRouter()
const details = ref<TargetDetailsData | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const selectedMonth = ref(currentMonthKey())

const isRider = computed(() => details.value?.role === 'rider')

const target1Progress = computed(() => {
  const target = details.value?.targets.target1 ?? 0
  const achieved = details.value?.targets.achieved_revenue ?? 0
  if (!target) return 0
  return Math.min(100, (achieved / target) * 100)
})

function formatCurrency(amount: number): string {
  return `₹${Math.max(0, amount).toLocaleString('en-IN')}`
}

function rankSuffix(rank: number): string {
  if (rank === 1) return 'st'
  if (rank === 2) return 'nd'
  if (rank === 3) return 'rd'
  return 'th'
}

function formatDate(iso?: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function openOrder(orderId: string): void {
  router.push({ name: 'OrderDetail', params: { id: orderId } })
}

async function fetchDetails(): Promise<void> {
  isLoading.value = true
  error.value = null
  try {
    const [year, month] = selectedMonth.value.split('-').map(Number)
    details.value = await getTargetDetails({
      month,
      year,
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load target details'
  } finally {
    isLoading.value = false
  }
}

async function handleRefresh(event: CustomEvent): Promise<void> {
  await fetchDetails()
  ;(event.target as HTMLIonRefresherElement).complete()
}

onMounted(fetchDetails)
onIonViewWillEnter(() => {
  if (!details.value) fetchDetails()
})

function currentMonthKey(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}
</script>

<style scoped>
.target-hero,
.summary-card,
.filters-card,
.prize-card {
  margin: 16px;
  padding: 16px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
}

.filters-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 12px;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-field label {
  font-size: var(--font-size-xs);
  font-weight: 800;
  color: var(--color-text-muted);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.filter-field input,
.filter-field select {
  width: 100%;
  min-height: 42px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-background);
  color: var(--color-text);
  font: inherit;
  font-weight: 700;
  padding: 0 10px;
}

.filter-apply {
  min-height: 44px;
  min-width: 120px;
  border: 0;
  border-radius: var(--radius-lg);
  background: var(--color-brand);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font: inherit;
  font-weight: 800;
}

.filter-apply:disabled {
  opacity: 0.65;
}

.target-hero {
  color: #fff;
  background: linear-gradient(135deg, var(--color-brand) 0%, var(--color-hero-dark) 100%);
}

.target-hero__period {
  margin: 0 0 14px;
  font-size: var(--font-size-sm);
  font-weight: 700;
  opacity: 0.82;
}

.target-hero__amounts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.target-hero__amounts span {
  display: block;
  margin-bottom: 4px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  opacity: 0.75;
  text-transform: uppercase;
}

.target-hero__amounts strong {
  font-size: 22px;
}

.progress-bar {
  height: 8px;
  margin-top: 16px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.28);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  background: #fff;
}

.target-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 0 16px;
}

.info-card {
  padding: 12px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
}

.info-card span,
.section-label {
  display: block;
  margin: 0 0 6px;
  font-size: var(--font-size-xs);
  font-weight: 800;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.info-card strong {
  display: block;
  font-size: var(--font-size-lg);
  color: var(--color-text);
}

.info-card small {
  display: block;
  margin-top: 4px;
  color: var(--color-text-muted);
}

.summary-row,
.prize-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);
}

.summary-row:last-child,
.prize-row:last-child {
  border-bottom: 0;
}

.summary-row span,
.prize-row span {
  color: var(--color-text-muted);
  font-weight: 600;
}

.summary-row--total {
  font-size: var(--font-size-base);
}

.summary-row--total strong {
  color: var(--color-success-text);
}

.summary-row--estimate strong {
  color: var(--color-brand);
}

.orders-section {
  padding: 0 16px 20px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.order-card {
  padding: 12px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
}

.order-card--clickable {
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    transform 0.1s ease,
    box-shadow 0.15s ease;
}

.order-card--clickable:active {
  transform: scale(0.99);
}

.order-card--clickable:focus-visible {
  outline: 2px solid var(--color-brand);
  outline-offset: 2px;
}

.order-card__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.order-card__number,
.order-card__customer {
  margin: 0;
}

.order-card__number {
  font-weight: 800;
  color: var(--color-text);
}

.order-card__customer {
  margin-top: 2px;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.commission-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.commission-grid span {
  padding: 8px;
  border-radius: var(--radius-lg);
  background: var(--color-background);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.commission-grid b {
  display: block;
  margin-top: 2px;
  color: var(--color-text);
}

.empty-state,
.empty-inline {
  margin: 24px 16px;
  padding: 48px 24px;
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  text-align: center;
  color: var(--color-text-muted);
}

.empty-state__icon {
  font-size: 36px;
  color: var(--color-brand);
}

.empty-state__title {
  margin: 10px 0 4px;
  font-size: 20px;
  font-weight: 800;
  color: var(--color-text);
}

.empty-state__text {
  margin: 0 0 14px;
}

.hero-skeleton,
.grid-skeleton,
.row-skeleton {
  border-radius: var(--radius-xl);
  background: linear-gradient(90deg, #eee 25%, #f5f5f5 37%, #eee 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}

.hero-skeleton {
  height: 138px;
  margin: 16px;
}

.grid-skeleton {
  height: 130px;
  margin: 0 16px 16px;
}

.row-skeleton {
  height: 96px;
}

@keyframes shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: 0 0; }
}
</style>
