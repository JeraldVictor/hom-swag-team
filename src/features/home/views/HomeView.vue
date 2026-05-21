<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button class="header-icon-btn" aria-label="Open menu" @click="openMenu">
            <Icon icon="lucide:menu" class="header-icon" />
          </ion-button>
        </ion-buttons>
        <ion-title class="header-title">HomSwag</ion-title>
        <ion-buttons slot="end">
          <ion-button class="header-icon-btn" aria-label="Notifications" @click="router.push('/notifications')">
            <div class="notif-wrap">
              <Icon icon="lucide:bell" class="header-icon" />
              <span v-if="unreadNotificationsCount > 0" class="notif-badge">
                {{ unreadNotificationsCount }}
              </span>
            </div>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="home-content" :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <!-- ── Hero ──────────────────────────────────────────────────────── -->
      <div class="home-hero anim-hero">
        <div class="home-hero__left">
          <p class="home-hero__greeting">{{ greeting }},</p>
          <p class="home-hero__name">{{ userName }}</p>
          <div class="home-hero__meta">
            <span class="home-hero__role-badge">{{ roleLabel }}</span>
            <span class="home-hero__date">{{ todayLabel }}</span>
          </div>
        </div>
        <div class="home-hero__avatar" aria-hidden="true">
          <img v-if="user?.photo?.url" :src="user.photo.url" :alt="user.name" class="home-hero__avatar-img" />
          <span v-else class="home-hero__avatar-initials">{{ initials }}</span>
        </div>
      </div>

      <!-- ── Loading skeleton ───────────────────────────────────────────── -->
      <template v-if="isLoading">
        <div class="kpi-row">
          <div v-for="n in 4" :key="n" class="kpi-skeleton" />
        </div>
        <div class="px-16">
          <div class="card-skeleton tall" />
          <div class="card-skeleton" />
          <div class="card-skeleton" />
        </div>
      </template>

      <!-- ── Dashboard content ─────────────────────────────────────────── -->
      <template v-else>

        <!-- ── Dashboard (Unified Metrics) ─────────────────────────────────── -->
        <div class="section dashboard-section">
          <div class="section-header">
            <p class="section-title">Today's Performance</p>
          </div>

          <!-- Earnings Overview -->
          <div class="earnings-grid anim-grid">
            <div class="earnings-main press-feedback" @click="goTo('/leaderboard')">
              <div class="earnings-main__top">
                <span class="earnings-main__label">Today's Earnings</span>
                <Icon icon="lucide:trending-up" class="earnings-main__icon" />
              </div>
              <div class="earnings-main__amount">{{ formatAmount(dashboard?.today_earnings) }}</div>
              <div class="earnings-main__progress">
                <div class="earnings-main__bar">
                  <div class="earnings-main__fill" :style="{ width: `${earningsProgress}%` }" />
                </div>
                <span class="earnings-main__target">Target: {{ formatAmountShort(DAILY_TARGET) }}</span>
              </div>
            </div>
            <div class="earnings-sub press-feedback" @click="goTo('/leaderboard')">
              <span class="earnings-sub__label">Month Total</span>
              <div class="earnings-sub__amount">{{ formatAmountShort(dashboard?.month_earnings) }}</div>
            </div>
          </div>

          <!-- Stats Grid -->
          <div class="stats-grid anim-grid">
            <div class="stat-card stat-card--purple" @click="goTo(isBeautician ? '/orders' : '/trips')">
              <div class="stat-card__icon-wrap">
                <Icon :icon="isBeautician ? 'lucide:briefcase' : 'lucide:car'" />
              </div>
              <div class="stat-card__content">
                <span class="stat-card__value">{{ todayActive }}</span>
                <span class="stat-card__label">Total Today</span>
              </div>
            </div>

            <div class="stat-card stat-card--green" @click="goTo(isBeautician ? '/orders' : '/trips', { status: 'Completed', date: 'today' })">
              <div class="stat-card__icon-wrap">
                <Icon icon="lucide:check-circle-2" />
              </div>
              <div class="stat-card__content">
                <span class="stat-card__value">{{ todayDone }}</span>
                <span class="stat-card__label">Completed</span>
              </div>
            </div>

            <div class="stat-card stat-card--red" @click="goTo(isBeautician ? '/orders' : '/trips', { status: 'Cancelled', date: 'today' })">
              <div class="stat-card__icon-wrap">
                <Icon icon="lucide:ban" />
              </div>
              <div class="stat-card__content">
                <span class="stat-card__value">{{ dashboard?.today_cancelled_count ?? 0 }}</span>
                <span class="stat-card__label">Cancelled</span>
              </div>
            </div>

            <div class="stat-card stat-card--orange" @click="goTo(isBeautician ? '/orders' : '/trips', { date: 'tomorrow' })">
              <div class="stat-card__icon-wrap">
                <Icon icon="lucide:calendar-days" />
              </div>
              <div class="stat-card__content">
                <span class="stat-card__value">{{ dashboard?.tomorrow_count ?? 0 }}</span>
                <span class="stat-card__label">Tomorrow</span>
              </div>
            </div>
          </div>

          <!-- Mini Stats Row -->
          <div class="mini-stats anim-grid">
            <div class="mini-stat" @click="goTo('/leave')">
              <Icon icon="lucide:calendar-off" class="mini-stat__icon" />
              <span class="mini-stat__text"><b>{{ dashboard?.pending_leaves_count ?? 0 }}</b> Pending Leaves</span>
            </div>
            <div class="mini-stat" @click="goTo('/notifications')">
              <Icon icon="lucide:bell-dot" class="mini-stat__icon" />
              <span class="mini-stat__text"><b>{{ unreadNotificationsCount }}</b> Notifications</span>
            </div>
          </div>
        </div>

        <!-- ── Leave balance ──────────────────────────────────────────── -->
        <div v-if="leaveBalanceEntries.length > 0" class="section">
          <div class="section-header">
            <p class="section-title">Leave Balance</p>
            <button class="section-link" @click="goTo('/leave')">
              Manage <Icon icon="lucide:arrow-right" />
            </button>
          </div>
          <div class="leave-balance-card">
            <div
              v-for="entry in leaveBalanceEntries"
              :key="entry.key"
              class="leave-balance-item"
            >
              <p class="leave-balance-item__count">{{ entry.value }}</p>
              <p class="leave-balance-item__label">{{ entry.label }}</p>
            </div>
          </div>
        </div>

        <!-- ── Rider-only: bike reminders ─────────────────────────────── -->
        <div v-if="isRider" class="section">
          <p class="section-title">Bike & Documents</p>
          <div class="reminder-list">
            <div class="reminder-item" @click="goTo('/profile')">
              <div class="reminder-item__icon-wrap reminder-item__icon-wrap--info">
                <Icon icon="lucide:file-badge" aria-hidden="true" />
              </div>
              <div class="reminder-item__body">
                <p class="reminder-item__title">Licence & PUC</p>
                <p class="reminder-item__sub">Keep documents up to date</p>
              </div>
              <Icon icon="lucide:chevron-right" class="reminder-item__chevron" aria-hidden="true" />
            </div>
            <div class="reminder-item" @click="goTo('/profile')">
              <div class="reminder-item__icon-wrap reminder-item__icon-wrap--warning">
                <Icon icon="lucide:shield-check" aria-hidden="true" />
              </div>
              <div class="reminder-item__body">
                <p class="reminder-item__title">Insurance</p>
                <p class="reminder-item__sub">Verify your bike insurance</p>
              </div>
              <Icon icon="lucide:chevron-right" class="reminder-item__chevron" aria-hidden="true" />
            </div>
          </div>
        </div>

        <!-- ── Beautician-only: complaints alert ──────────────────────── -->
        <div v-if="isBeautician && hasComplaints" class="section">
          <div class="alert-card alert-card--warning" @click="goTo('/complaints')">
            <Icon icon="lucide:message-circle-warning" class="alert-card__icon" aria-hidden="true" />
            <div class="alert-card__body">
              <p class="alert-card__title">You have complaints to review</p>
              <p class="alert-card__sub">Tap to view complaints visible to you</p>
            </div>
            <Icon icon="lucide:chevron-right" class="alert-card__chevron" aria-hidden="true" />
          </div>
        </div>

        <!-- ── Quick actions ──────────────────────────────────────────── -->
        <div class="section">
          <p class="section-title">Quick Actions</p>
          <div class="quick-actions anim-grid">
            <button class="quick-action" @click="goTo(isBeautician ? '/orders' : '/trips')">
              <div class="quick-action__icon-wrap quick-action__icon-wrap--brand">
                <Icon :icon="isBeautician ? 'lucide:briefcase' : 'lucide:car'" aria-hidden="true" />
              </div>
              <span>{{ isBeautician ? 'Orders' : 'Trips' }}</span>
            </button>
            <button class="quick-action" @click="goTo('/calendar')">
              <div class="quick-action__icon-wrap quick-action__icon-wrap--info">
                <Icon icon="lucide:calendar-days" aria-hidden="true" />
              </div>
              <span>Calendar</span>
            </button>
            <button class="quick-action" @click="goTo('/leave')">
              <div class="quick-action__icon-wrap quick-action__icon-wrap--warning">
                <Icon icon="lucide:calendar" aria-hidden="true" />
              </div>
              <span>Leave</span>
            </button>
            <button class="quick-action" @click="goTo('/notifications')">
              <div class="quick-action__icon-wrap quick-action__icon-wrap--success">
                <Icon icon="lucide:bell" aria-hidden="true" />
              </div>
              <span>Notifications</span>
            </button>
            <button v-if="isBeautician" class="quick-action" @click="goTo('/complaints')">
              <div class="quick-action__icon-wrap quick-action__icon-wrap--error">
                <Icon icon="lucide:message-circle-warning" aria-hidden="true" />
              </div>
              <span>Complaints</span>
            </button>
            <button v-if="isBeautician" class="quick-action" @click="goTo('/external-bookings')">
              <div class="quick-action__icon-wrap quick-action__icon-wrap--purple">
                <Icon icon="lucide:car-taxi-front" aria-hidden="true" />
              </div>
              <span>External Trip</span>
            </button>
            <button class="quick-action" @click="goTo('/support')">
              <div class="quick-action__icon-wrap quick-action__icon-wrap--default">
                <Icon icon="lucide:life-buoy" aria-hidden="true" />
              </div>
              <span>Support</span>
            </button>
          </div>
        </div>

        <div class="bottom-spacer" />
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onIonViewWillEnter } from '@ionic/vue'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getComplaints, getDashboard, getOrders, getTrips } from '@/shared/api'
import { useDrawer } from '@/shared/composables'
import { useNavigation } from '@/shared/composables/useNavigation'
import { formatISTDateShort } from '@/shared/lib/datetime'
import type { DashboardData, Order, Trip } from '@/shared/models'
import { useAuthStore, useUserTypeStore } from '@/shared/stores'

const router = useRouter()
const authStore = useAuthStore()
const userTypeStore = useUserTypeStore()
const { openDrawer } = useDrawer()
const { openNavigationMenu } = useNavigation()

function openMenu(): void {
  openDrawer()
}
const { user } = storeToRefs(authStore)
const { isBeautician, isRider } = storeToRefs(userTypeStore)

// ── State ──────────────────────────────────────────────────────────────────

const dashboard = ref<DashboardData | null>(null)
const orders = ref<Order[]>([])
const trips = ref<Trip[]>([])
const hasComplaints = ref(false)
const isLoading = ref(false)

// ── Computed: user info ────────────────────────────────────────────────────

const userName = computed(() => user.value?.name?.split(' ')[0] ?? 'there')
const roleLabel = computed(() => (isBeautician.value ? 'Beautician' : 'Rider'))

const initials = computed(() => {
  const name = user.value?.name ?? ''
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0]?.toUpperCase() ?? '')
    .join('')
})

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
})

const todayLabel = computed(() =>
  new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
)

// ── Computed: order buckets ────────────────────────────────────────────────

const todayStr = formatISTDateShort(new Date().toISOString())

function isToday(iso?: string | Date): boolean {
  if (!iso) return false
  const dateStr = typeof iso === 'string' ? iso : iso.toISOString()
  const istDate = formatISTDateShort(dateStr)
  return istDate === todayStr
}

const upcomingOrders = computed(() =>
  orders.value.filter(o => {
    const s = o.status?.toLowerCase()
    // Only show confirmed orders as upcoming work for beauticians
    return s === 'confirmed' && isToday(o.booking_info?.date)
  })
)

const ongoingOrders = computed(() =>
  orders.value.filter(o => {
    const s = o.status?.toLowerCase()
    return s === 'started' || s === 'ongoing' || s === 'arrived' || s === 'in_progress'
  })
)

const completedOrders = computed(() =>
  orders.value.filter(o => {
    const s = o.status?.toLowerCase()
    return s === 'completed' && isToday(o.updated_at || o.booking_info?.date)
  })
)

const cancelledOrders = computed(() =>
  orders.value.filter(o => {
    const s = o.status?.toLowerCase()
    return (
      (s === 'cancelled' || s === 'arrived_and_cancelled') &&
      isToday(o.updated_at || o.booking_info?.date)
    )
  })
)

// ── Computed: trip buckets ─────────────────────────────────────────────────

const upcomingTrips = computed(() =>
  trips.value.filter(t => t.kanban_state === 'Assigned' || t.kanban_state === 'Viewed')
)

const activeTrips = computed(() => trips.value.filter(t => t.kanban_state === 'Trip Started'))

const completedTrips = computed(() =>
  trips.value.filter(t => {
    const done = t.kanban_state === 'Completed' || t.kanban_state === 'Fare Calculated'
    return done && isToday(t.updated_at ?? t.created_at)
  })
)

const cancelledTrips = computed(() =>
  trips.value.filter(t => {
    const s = t.kanban_state?.toLowerCase()
    return s === 'cancelled' && isToday(t.updated_at ?? t.created_at)
  })
)

// ── Computed: KPI strip ────────────────────────────────────────────────────

const todayActive = computed(() => {
  if (dashboard.value && typeof dashboard.value.today_count === 'number') {
    return dashboard.value.today_count
  }
  return isBeautician.value
    ? ongoingOrders.value.length + upcomingOrders.value.length
    : activeTrips.value.length + upcomingTrips.value.length
})

const todayDone = computed(() => {
  if (dashboard.value && typeof dashboard.value.today_completed_count === 'number') {
    return dashboard.value.today_completed_count
  }
  return isBeautician.value ? completedOrders.value.length : completedTrips.value.length
})

// ── Computed: earnings ─────────────────────────────────────────────────────

const DAILY_TARGET = 2000 // ₹ — placeholder, could come from profile

const earningsProgress = computed(() => {
  const earned = dashboard.value?.today_earnings ?? 0
  return earned > 0 ? (earned / DAILY_TARGET) * 100 : 0
})

// ── Computed: leave balance ────────────────────────────────────────────────

const leaveBalanceEntries = computed(() => {
  const lb = dashboard.value?.leave_balance
  if (!lb || typeof lb !== 'object') return []
  const labelMap: Record<string, string> = {
    paid_leave: 'Paid',
    sick_leave: 'Sick',
    loss_of_pay: 'LOP',
    block_time: 'Block',
  }
  return Object.entries(lb)
    .filter(([, v]) => typeof v === 'number')
    .map(([k, v]) => ({ key: k, value: v as number, label: labelMap[k] ?? k }))
})

const unreadNotificationsCount = computed(() => dashboard.value?.unread_notifications_count ?? 0)

// ── Fetch ──────────────────────────────────────────────────────────────────

async function fetchAll(): Promise<void> {
  // If user profile isn't loaded yet, wait for it (handled by the watch)
  if (!user.value) {
    console.log('[HomeView] Waiting for user profile before fetching...')
    return
  }

  console.log('[HomeView] Fetching all dashboard data for:', user.value.user_type)
  isLoading.value = true
  try {
    const uType = user.value.user_type
    const calls: Promise<unknown>[] = [
      getDashboard()
        .then(d => {
          console.log('[HomeView] Dashboard data received:', d)
          dashboard.value = d
        })
        .catch(err => console.error('[HomeView] Failed to fetch dashboard:', err)),
    ]

    if (uType === 'beautician') {
      calls.push(
        getOrders(1, 100)
          .then(res => {
            const list = Array.isArray(res) ? res : (res.data ?? [])
            console.log('[HomeView] Orders received from API:', list.length)
            // Only overwrite if we didn't already extract them from trips,
            // or if the API returned more/different relevant data
            if (list.length > 0 || orders.value.length === 0) {
              orders.value = list
            }
          })
          .catch(err => console.error('[HomeView] Failed to fetch orders:', err)),
        getComplaints()
          .then(list => {
            console.log('[HomeView] Complaints received:', list.length)
            hasComplaints.value = list.length > 0
          })
          .catch(err => console.error('[HomeView] Failed to fetch complaints:', err))
      )
    } else {
      calls.push(
        getTrips(1, 100)
          .then(list => {
            console.log('[HomeView] Trips received:', list.length)
            trips.value = list
          })
          .catch(err => console.error('[HomeView] Failed to fetch trips:', err))
      )
    }

    await Promise.all(calls)
    console.log('[HomeView] All data fetched successfully')
  } catch (err) {
    console.error('[HomeView] Global fetch error:', err)
  } finally {
    isLoading.value = false
  }
}

async function handleRefresh(event: CustomEvent): Promise<void> {
  await fetchAll()
  ;(event.target as HTMLIonRefresherElement).complete()
}

function goTo(path: string, query?: Record<string, string>): void {
  router.push({ path, query })
}

function formatAmount(val?: number): string {
  if (val == null) return '₹0'
  return `₹${val.toLocaleString('en-IN')}`
}

function formatAmountShort(val?: number): string {
  if (val == null) return '₹0'
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`
  return `₹${val}`
}

onMounted(fetchAll)
onIonViewWillEnter(fetchAll)

// Re-fetch when user identity is confirmed (prevents blank state on first boot)
watch([isBeautician, isRider], ([newB, newR]) => {
  if (newB || newR) {
    console.log('[HomeView] User type confirmed, re-fetching...')
    fetchAll()
  }
})
</script>

<style scoped>
.header-title {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.3px;
  color: var(--color-brand);
}

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

.notif-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notif-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--color-error);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  min-width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 1.5px solid var(--color-background);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.home-content {
  --background: var(--color-background);
}

/* ── Hero ────────────────────────────────────────────────────────────────── */
.home-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 28px 16px 24px;
  background: linear-gradient(135deg, var(--color-brand) 0%, var(--color-hero-dark) 100%);
}

.home-hero__greeting {
  margin: 0;
  font-size: var(--font-size-sm);
  color: rgba(255,255,255,0.75);
  font-weight: 500;
}

.home-hero__name {
  margin: 2px 0 8px;
  font-size: var(--font-size-2xl);
  font-weight: 800;
  color: #fff;
}

.home-hero__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.home-hero__role-badge {
  font-size: var(--font-size-xs);
  font-weight: 700;
  background: rgba(255,255,255,0.2);
  color: #fff;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  border: 1px solid rgba(255,255,255,0.3);
}

.home-hero__date {
  font-size: var(--font-size-xs);
  color: rgba(255,255,255,0.65);
}

.home-hero__avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  border: 2px solid rgba(255,255,255,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.home-hero__avatar-img { width: 100%; height: 100%; object-fit: cover; }

.home-hero__avatar-initials {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

/* ── Sections ────────────────────────────────────────────────────────────── */
.section { padding: 16px 16px 0; }

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.section-title {
  margin: 0 0 10px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.section-header .section-title { margin-bottom: 0; }

.section-link {
  display: flex;
  align-items: center;
  gap: 3px;
  background: none;
  border: none;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-brand);
  cursor: pointer;
  padding: 0;
}

/* ── Dashboard (Unified) ─────────────────────────────────────────────────── */
.dashboard-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 8px;
}

/* Earnings Grid */
.earnings-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 10px;
}

.earnings-main {
  background: linear-gradient(135deg, var(--color-brand) 0%, var(--color-hero-dark) 100%);
  border-radius: var(--radius-xl);
  padding: 16px;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 8px 24px rgba(var(--color-brand-rgb, 124, 58, 237), 0.25);
}

.earnings-main__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.earnings-main__label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.8;
}

.earnings-main__icon { font-size: 16px; opacity: 0.9; }

.earnings-main__amount {
  font-size: 28px;
  font-weight: 900;
  margin: 4px 0 12px;
}

.earnings-main__progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.earnings-main__bar {
  height: 4px;
  background: rgba(255,255,255,0.2);
  border-radius: 2px;
  overflow: hidden;
}

.earnings-main__fill {
  height: 100%;
  background: #fff;
  border-radius: 2px;
  transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.earnings-main__target {
  font-size: 10px;
  font-weight: 600;
  opacity: 0.7;
  text-align: right;
}

.earnings-sub {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 14px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.earnings-sub__label {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.earnings-sub__amount {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-brand);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.stat-card {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: transform 0.14s ease, border-color 0.14s ease;
}

.stat-card:active {
  transform: scale(0.96);
  border-color: var(--color-brand);
}

.stat-card__icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.stat-card--purple .stat-card__icon-wrap { background: var(--color-brand-pale); color: var(--color-brand); }
.stat-card--green  .stat-card__icon-wrap { background: var(--color-success-bg); color: var(--color-success); }
.stat-card--red    .stat-card__icon-wrap { background: var(--color-error-bg);   color: var(--color-error); }
.stat-card--orange .stat-card__icon-wrap { background: var(--color-warning-bg); color: var(--color-warning); }

.stat-card__content {
  display: flex;
  flex-direction: column;
}

.stat-card__value {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1.2;
}

.stat-card__label {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
}

/* Mini Stats */
.mini-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.mini-stat {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-background);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  padding: 8px 12px;
  cursor: pointer;
}

.mini-stat:active { opacity: 0.7; }

.mini-stat__icon { font-size: 14px; color: var(--color-text-muted); }

.mini-stat__text {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.mini-stat__text b { color: var(--color-text); font-weight: 700; }

/* ── Next card ───────────────────────────────────────────────────────────── */
.next-card {
  display: flex;
  align-items: center;
  gap: 0;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.14s ease, box-shadow 0.14s ease;
}

.next-card:active {
  transform: scale(0.985);
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
}

.next-card__accent {
  width: 4px;
  align-self: stretch;
  background: linear-gradient(180deg, var(--color-brand) 0%, var(--color-hero-dark) 100%);
  flex-shrink: 0;
}

.next-card__body {
  flex: 1;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.next-card__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.next-card__number {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text);
}

.next-card__customer,
.next-card__address,
.next-card__time {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.next-card__chevron {
  font-size: 18px;
  color: var(--color-text-muted);
  flex-shrink: 0;
  margin-right: 12px;
}

/* ── Status badges ───────────────────────────────────────────────────────── */
.next-card__status-badge,
.upcoming-card__status {
  font-size: var(--font-size-xs);
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.status--pending  { background: var(--color-warning-bg);  color: var(--color-warning-text); }
.status--active   { background: var(--color-info-bg);     color: var(--color-info-text); }
.status--done     { background: var(--color-success-bg);  color: var(--color-success-text); }

/* ── Upcoming cards list ─────────────────────────────────────────────────── */
.upcoming-cards {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.upcoming-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s ease;
}

.upcoming-card:last-child { border-bottom: none; }
.upcoming-card:active { background: var(--color-background); }

.upcoming-card__left { flex-shrink: 0; }

.upcoming-card__icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-lg);
  background: var(--color-brand-pale);
  color: var(--color-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.upcoming-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.upcoming-card__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.upcoming-card__ref {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text);
}

.upcoming-card__customer {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.upcoming-card__time {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.upcoming-card__time-icon { font-size: 12px; }

.upcoming-card__chevron {
  font-size: 16px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

/* ── Earnings card ───────────────────────────────────────────────────────── */
.earnings-card {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 16px;
}

.earnings-card__row {
  display: flex;
  align-items: stretch;
  gap: 0;
}

.earnings-card__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.earnings-card__divider {
  width: 1px;
  background: var(--color-border);
  margin: 0 4px;
}

.earnings-card__label {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.earnings-card__amount {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 800;
  color: var(--color-text);
}

.earnings-card__amount--highlight { color: var(--color-brand); }

.earnings-progress {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.earnings-progress__bar {
  height: 6px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: 6px;
}

.earnings-progress__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-brand) 0%, var(--color-brand-mid) 100%);
  border-radius: var(--radius-full);
  transition: width 0.6s ease;
}

.earnings-progress__label {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  text-align: right;
}

/* ── Leave balance ───────────────────────────────────────────────────────── */
.leave-balance-card {
  display: flex;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.leave-balance-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 8px;
  border-right: 1px solid var(--color-border);
  gap: 3px;
}

.leave-balance-item:last-child { border-right: none; }

.leave-balance-item__count {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 800;
  color: var(--color-brand);
}

.leave-balance-item__label {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  font-weight: 600;
  text-align: center;
}

/* ── Reminder list ───────────────────────────────────────────────────────── */
.reminder-list {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.reminder-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 14px;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s ease;
}

.reminder-item:last-child { border-bottom: none; }
.reminder-item:active { background: var(--color-background); }

.reminder-item__icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.reminder-item__icon-wrap--info    { background: var(--color-info-bg);    color: var(--color-info-text); }
.reminder-item__icon-wrap--warning { background: var(--color-warning-bg); color: var(--color-warning-text); }

.reminder-item__body { flex: 1; }

.reminder-item__title {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
}

.reminder-item__sub {
  margin: 2px 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.reminder-item__chevron { font-size: 16px; color: var(--color-text-muted); }

/* ── Alert card ──────────────────────────────────────────────────────────── */
.alert-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--radius-xl);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.14s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.14s ease;
}

.alert-card:active {
  transform: scale(0.97);
  opacity: 0.85;
}

.alert-card--warning {
  background: var(--color-warning-bg);
  border: 1.5px solid var(--color-warning);
}

.alert-card__icon { font-size: 22px; color: var(--color-warning-text); flex-shrink: 0; }

.alert-card__body { flex: 1; }

.alert-card__title {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-warning-text);
}

.alert-card__sub {
  margin: 2px 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-warning-text);
  opacity: 0.8;
}

.alert-card__chevron { font-size: 16px; color: var(--color-warning-text); opacity: 0.7; }

/* ── Quick actions ───────────────────────────────────────────────────────── */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.quick-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 14px 8px;
  cursor: pointer;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  transition: transform 0.14s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.15s ease, box-shadow 0.14s ease;
  -webkit-tap-highlight-color: transparent;
}

.quick-action:active {
  transform: scale(0.92);
  background: var(--color-background);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.quick-action__icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.quick-action__icon-wrap--brand   { background: var(--color-brand-pale);  color: var(--color-brand); }
.quick-action__icon-wrap--warning { background: var(--color-warning-bg);  color: var(--color-warning-text); }
.quick-action__icon-wrap--info    { background: var(--color-info-bg);     color: var(--color-info-text); }
.quick-action__icon-wrap--error   { background: var(--color-error-bg);    color: var(--color-error-text); }
.quick-action__icon-wrap--success { background: var(--color-success-bg);  color: var(--color-success-text); }
.quick-action__icon-wrap--default { background: var(--color-background);  color: var(--color-text-secondary); }

/* ── Skeletons ───────────────────────────────────────────────────────────── */
.kpi-skeleton {
  height: 72px;
  background: linear-gradient(90deg, var(--color-border) 25%, var(--color-background) 50%, var(--color-border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.px-16 { padding: 16px; display: flex; flex-direction: column; gap: 12px; }

.card-skeleton {
  height: 80px;
  border-radius: var(--radius-xl);
  background: linear-gradient(90deg, var(--color-border) 25%, var(--color-background) 50%, var(--color-border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.card-skeleton.tall { height: 140px; }

.bottom-spacer { height: 24px; }

/* ── Today's list ────────────────────────────────────────────────────────── */
.today-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 16px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
}

.today-empty__icon {
  font-size: 36px;
  color: var(--color-text-muted);
}

.today-empty__text {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.today-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.today-card {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: transform 0.14s ease, box-shadow 0.14s ease;
}

.today-card:active {
  transform: scale(0.985);
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
}

/* Left accent stripe by status */
.today-card--active  { border-left: 4px solid var(--color-info); }
.today-card--pending { border-left: 4px solid var(--color-warning); }
.today-card--done    { border-left: 4px solid rgba(var(--color-success-rgb, 34, 197, 94), 0.5); }
.today-card--cancelled { border-left: 4px solid var(--color-error); }

.today-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 8px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.today-card__header:active { background: var(--color-background); }

.today-card__header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.today-card__icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.today-card__icon-wrap--active    { background: var(--color-info-bg);    color: var(--color-info-text); }
.today-card__icon-wrap--pending   { background: var(--color-warning-bg); color: var(--color-warning-text); }
.today-card__icon-wrap--done      { background: var(--color-success-bg); color: var(--color-success-text); }
.today-card__icon-wrap--cancelled { background: var(--color-error-bg);   color: var(--color-error-text); }

.today-card__ref-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.today-card__ref {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text);
}

.today-card__badge {
  font-size: var(--font-size-xs);
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.today-card__customer {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 3px 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.today-card__chevron {
  font-size: 16px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.today-card__details {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 0 14px 10px;
  cursor: pointer;
}

.today-card__detail {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.today-card__detail--fare {
  color: var(--color-success-text);
  font-weight: 700;
}

.today-card__actions {
  display: flex;
  gap: 8px;
  padding: 0 14px 12px;
  flex-wrap: wrap;
}

.today-action-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  border: none;
  border-radius: var(--radius-lg);
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 0.15s ease;
}

.today-action-btn:active { opacity: 0.75; }

.today-action-btn--primary { background: var(--color-brand-pale);  color: var(--color-brand); }
.today-action-btn--success { background: var(--color-success-bg);  color: var(--color-success-text); }
.today-action-btn--info    { background: var(--color-info-bg);     color: var(--color-info-text); }
.today-action-btn--danger  { background: var(--color-error-bg);    color: var(--color-error-text); }
.today-action-btn--default { background: var(--color-background);  color: var(--color-text-secondary); }

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
