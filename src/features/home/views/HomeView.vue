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

        <!-- KPI strip -->
        <div class="kpi-row anim-grid">
          <div class="kpi-card kpi-card--brand">
            <Icon icon="lucide:zap" class="kpi-card__icon" aria-hidden="true" />
            <p class="kpi-card__value">{{ todayActive }}</p>
            <p class="kpi-card__label">Active Today</p>
          </div>
          <div class="kpi-card kpi-card--success" @click="goTo('/orders', { date: 'today', status: 'Completed' })">
            <Icon icon="lucide:circle-check-big" class="kpi-card__icon" aria-hidden="true" />
            <p class="kpi-card__value">{{ todayDone }}</p>
            <p class="kpi-card__label">Completed</p>
          </div>
          <div class="kpi-card kpi-card--success" @click="goTo('/orders', { date: 'past', status: 'Completed' })">
            <Icon icon="lucide:layout-grid" class="kpi-card__icon" aria-hidden="true" />
            <p class="kpi-card__value">{{ monthDone }}</p>
            <p class="kpi-card__label">Month Total</p>
          </div>
        </div>

        <!-- ── Today at a glance ──────────────────────────────────────── -->
        <div class="section">
          <div class="section-header">
            <p class="section-title">Today at a Glance</p>
          </div>
          <div class="glance-grid anim-grid">
            <!-- Beautician: upcoming orders -->
            <template v-if="isBeautician">
                <div class="glance-card glance-card--purple press-feedback" @click="goTo('/orders', { date: 'tomorrow' })">
                  <div class="glance-card__top">
                    <Icon icon="lucide:clock" class="glance-card__icon" aria-hidden="true" />
                    <span class="glance-card__count">{{ upcomingWorkload }}</span>
                  </div>
                  <p class="glance-card__label">Upcoming Orders</p>
                  <p class="glance-card__sub">Tap to view</p>
                </div>
                <div class="glance-card glance-card--green" @click="goTo('/orders', { status: 'Completed', date: 'today' })">
                  <div class="glance-card__top">
                    <Icon icon="lucide:check-circle-2" class="glance-card__icon" aria-hidden="true" />
                    <span class="glance-card__count">{{ todayDone }}</span>
                  </div>
                  <p class="glance-card__label">Completed Orders</p>
                  <p class="glance-card__sub">Today</p>
                </div>
                <div class="glance-card glance-card--blue" @click="goTo('/orders', { status: 'Ongoing' })">
                  <div class="glance-card__top">
                    <Icon icon="lucide:loader" class="glance-card__icon" aria-hidden="true" />
                    <span class="glance-card__count">{{ ongoingOrders.length }}</span>
                  </div>
                  <p class="glance-card__label">In Progress</p>
                  <p class="glance-card__sub">Right now</p>
                </div>
                <div class="glance-card glance-card--orange" @click="goTo('/orders', { date: 'past' })">
                  <div class="glance-card__top">
                    <Icon icon="lucide:package" class="glance-card__icon" aria-hidden="true" />
                    <span class="glance-card__count">{{ monthDone }}</span>
                  </div>
                  <p class="glance-card__label">This Month</p>
                  <p class="glance-card__sub">Total orders</p>
                </div>
            </template>

            <!-- Rider: upcoming trips -->
            <template v-else>
              <div class="glance-card glance-card--purple" @click="goTo('/trips')">
                <div class="glance-card__top">
                  <Icon icon="lucide:clock" class="glance-card__icon" aria-hidden="true" />
                  <span class="glance-card__count">{{ upcomingTrips.length }}</span>
                </div>
                <p class="glance-card__label">Upcoming Trips</p>
                <p class="glance-card__sub">Tap to view</p>
              </div>
              <div class="glance-card glance-card--green" @click="goTo('/trips')">
                <div class="glance-card__top">
                  <Icon icon="lucide:check-circle-2" class="glance-card__icon" aria-hidden="true" />
                  <span class="glance-card__count">{{ completedTrips.length }}</span>
                </div>
                <p class="glance-card__label">Completed Trips</p>
                <p class="glance-card__sub">Today</p>
              </div>
              <div class="glance-card glance-card--blue" @click="goTo('/trips')">
                <div class="glance-card__top">
                  <Icon icon="lucide:navigation" class="glance-card__icon" aria-hidden="true" />
                  <span class="glance-card__count">{{ activeTrips.length }}</span>
                </div>
                <p class="glance-card__label">In Progress</p>
                <p class="glance-card__sub">Right now</p>
              </div>
              <div class="glance-card glance-card--orange" @click="goTo('/trips')">
                <div class="glance-card__top">
                  <Icon icon="lucide:route" class="glance-card__icon" aria-hidden="true" />
                  <span class="glance-card__count">{{ dashboard?.month_count ?? 0 }}</span>
                </div>
                <p class="glance-card__label">This Month</p>
                <p class="glance-card__sub">Total trips</p>
              </div>
            </template>
          </div>
        </div>

        <!-- ── Next up card (most urgent item) ───────────────────────── -->
        <div v-if="nextItem" class="section">
          <div class="section-header">
            <p class="section-title">{{ isBeautician ? 'Next Order' : 'Next Trip' }}</p>
            <AppButton variant="clear" size="sm" @click="goTo(isBeautician ? '/orders' : '/trips')">
              View all <Icon icon="lucide:arrow-right" style="margin-left: 4px;" />
            </AppButton>
          </div>
          <div class="next-card" @click="goToDetail(nextItem)">
            <div class="next-card__accent" />
            <div class="next-card__body">
              <div class="next-card__row">
                <span class="next-card__number">#{{ nextItem.ref }}</span>
                <span class="next-card__status-badge" :class="`status--${nextItem.statusClass}`">
                  {{ nextItem.statusLabel }}
                </span>
              </div>
              <p v-if="nextItem.customer" class="next-card__customer">
                <Icon icon="lucide:user" aria-hidden="true" />
                {{ nextItem.customer }}
              </p>
              <p v-if="nextItem.address" class="next-card__address">
                <Icon icon="lucide:map-pin" aria-hidden="true" />
                {{ nextItem.address }}
              </p>
              <p v-if="nextItem.time" class="next-card__time">
                <Icon icon="lucide:clock" aria-hidden="true" />
                {{ nextItem.time }}
              </p>
            </div>
            <Icon icon="lucide:chevron-right" class="next-card__chevron" aria-hidden="true" />
          </div>
        </div>

        <!-- ── Today's Orders / Trips ────────────────────────────────── -->
        <div class="section">
          <div class="section-header">
            <p class="section-title">Today's {{ isBeautician ? 'Orders' : 'Trips' }}</p>
            <button class="section-link" @click="goTo(isBeautician ? '/orders' : '/trips')">
              View all <Icon icon="lucide:arrow-right" />
            </button>
          </div>

          <!-- Empty state -->
          <div v-if="todayList.length === 0" class="today-empty">
            <Icon :icon="isBeautician ? 'lucide:briefcase' : 'lucide:car'" class="today-empty__icon" aria-hidden="true" />
            <p class="today-empty__text">No {{ isBeautician ? 'orders' : 'trips' }} for today</p>
          </div>

          <!-- Grouped list -->
          <div v-else class="today-list anim-list">
            <div
              v-for="item in displayTodayList"
              :key="item.id"
              class="today-card"
              :class="`today-card--${item.statusClass}`"
            >
              <!-- Top row: ref + status badge -->
              <div class="today-card__header" @click="goToDetail(item)">
                <div class="today-card__header-left">
                  <div class="today-card__icon-wrap" :class="`today-card__icon-wrap--${item.statusClass}`">
                    <Icon :icon="isBeautician ? 'lucide:briefcase' : 'lucide:car'" aria-hidden="true" />
                  </div>
                  <div>
                    <div class="today-card__ref-row">
                      <span class="today-card__ref">#{{ item.ref }}</span>
                      <span class="today-card__badge" :class="`status--${item.statusClass}`">
                        {{ item.statusLabel }}
                      </span>
                    </div>
                    <p v-if="item.customer" class="today-card__customer">
                      <Icon icon="lucide:user" aria-hidden="true" />
                      {{ item.customer }}
                    </p>
                  </div>
                </div>
                <Icon icon="lucide:chevron-right" class="today-card__chevron" aria-hidden="true" />
              </div>

              <!-- Detail row: address + time -->
              <div v-if="item.address || item.time" class="today-card__details" @click="goToDetail(item)">
                <span v-if="item.address" class="today-card__detail">
                  <Icon icon="lucide:map-pin" aria-hidden="true" />
                  {{ item.address }}
                </span>
                <span v-if="item.time" class="today-card__detail">
                  <Icon icon="lucide:clock" aria-hidden="true" />
                  {{ item.time }}
                </span>
                <span v-if="item.fare" class="today-card__detail today-card__detail--fare">
                  <Icon icon="lucide:indian-rupee" aria-hidden="true" />
                  {{ item.fare }}
                </span>
              </div>

              <!-- Quick action buttons -->
              <div v-if="item.actions.length > 0" class="today-card__actions">
                <button
                  v-for="action in item.actions"
                  :key="action.label"
                  class="today-action-btn"
                  :class="`today-action-btn--${action.variant}`"
                  @click.stop="action.handler()"
                >
                  <Icon :icon="action.icon" aria-hidden="true" />
                  {{ action.label }}
                </button>
              </div>
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
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
  IonRefresher, IonRefresherContent, onIonViewWillEnter, actionSheetController
} from '@ionic/vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useAuthStore, useUserTypeStore } from '@/shared/stores'
import { useDrawer } from '@/shared/composables'
import { AppButton } from '@/shared/components/ui'
import { getDashboard, getOrders, getTrips, getComplaints } from '@/shared/api'
import type { DashboardData, Order, Trip } from '@/shared/models'
import { formatISTDateShort } from '@/shared/lib/datetime'

import { useNavigation } from '@/shared/composables/useNavigation'

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
const roleLabel = computed(() => isBeautician.value ? 'Beautician' : 'Rider')

const initials = computed(() => {
  const name = user.value?.name ?? ''
  return name.split(' ').slice(0, 2).map((n) => n[0]?.toUpperCase() ?? '').join('')
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
  orders.value.filter((o) => {
    const s = o.status?.toLowerCase()
    // Include valid upcoming statuses for TODAY
    return (s === 'confirmed' || s === 'pending' || s === 'assigned' || s === 'assigned_draft') && isToday(o.booking_info?.date)
  })
)

const ongoingOrders = computed(() =>
  orders.value.filter((o) => {
    const s = o.status?.toLowerCase()
    return s === 'started' || s === 'ongoing' || s === 'arrived' || s === 'in_progress'
  })
)

const completedOrders = computed(() =>
  orders.value.filter((o) => {
    const s = o.status?.toLowerCase()
    // Count it as 'Done Today' if it was finished today, regardless of original schedule
    return s === 'completed' && isToday(o.updated_at || o.booking_info?.date)
  })
)

// ── Computed: trip buckets ─────────────────────────────────────────────────

const upcomingTrips = computed(() =>
  trips.value.filter((t) => t.kanban_state === 'Assigned' || t.kanban_state === 'Viewed')
)

const activeTrips = computed(() =>
  trips.value.filter((t) => t.kanban_state === 'Trip Started')
)

const completedTrips = computed(() =>
  trips.value.filter((t) => {
    const done = t.kanban_state === 'Completed' || t.kanban_state === 'Fare Calculated'
    return done && isToday(t.updated_at ?? t.created_at)
  })
)

// ── Computed: KPI strip ────────────────────────────────────────────────────

const todayActive = computed(() => {
  if (dashboard.value && typeof dashboard.value.todays_count === 'number') {
    return dashboard.value.todays_count
  }
  return isBeautician.value
    ? ongoingOrders.value.length + upcomingOrders.value.length
    : activeTrips.value.length + upcomingTrips.value.length
})

const todayDone = computed(() =>
  isBeautician.value ? completedOrders.value.length : completedTrips.value.length
)

const monthDone = computed(() => dashboard.value?.month_count ?? 0)

const upcomingWorkload = computed(() => dashboard.value?.all_upcoming_count ?? upcomingOrders.value.length)

// ── Computed: next item card ───────────────────────────────────────────────

interface ItemAction {
  label: string
  icon: string
  variant: 'primary' | 'success' | 'info' | 'danger' | 'default'
  handler: () => void
}

interface ListItem {
  id: string | number
  ref: string
  status: string
  statusLabel: string
  statusClass: string
  customer?: string
  address?: string
  time?: string
  fare?: string
  type: 'order' | 'trip'
  actions: ItemAction[]
}

function orderToItem(o: Order): ListItem {
  const s = o.status?.toLowerCase() ?? ''
  const statusClass = s === 'completed' ? 'done'
    : (s === 'started' || s === 'ongoing') ? 'active'
    : s === 'arrived_and_cancelled' ? 'cancelled'
    : 'pending'
  const statusLabel = s === 'confirmed' ? 'Confirmed'
    : s === 'started' ? 'Started'
    : s === 'ongoing' ? 'Ongoing'
    : s === 'completed' ? 'Completed'
    : s === 'assigned_draft' || s === 'assigned' ? 'Assigned'
    : s === 'arrived_and_cancelled' ? 'Cancelled'
    : o.status
  const addr = o.delivery_address ?? o.address
  const id = o.id ?? o._id ?? ''

  const actions: ItemAction[] = []
  if (s === 'confirmed') {
    actions.push({
      label: 'View Details',
      icon: 'lucide:eye',
      variant: 'primary',
      handler: () => router.push(`/orders/${id}`),
    })
  }
  if (s === 'started' || s === 'ongoing') {
    actions.push({
      label: 'Update Status',
      icon: 'lucide:refresh-cw',
      variant: 'success',
      handler: () => router.push(`/orders/${id}`),
    })
  }
  if (addr?.latitude && addr?.longitude) {
    actions.push({
      label: 'Navigate',
      icon: 'lucide:navigation',
      variant: 'info',
      handler: () => openNavigationMenu(Number(addr.latitude), Number(addr.longitude), o.customer?.full_name || 'Customer'),
    })
  }
  if (isBeautician.value && (s === 'confirmed' || s === 'started' || s === 'ongoing')) {
    actions.push({
      label: 'Book Ride',
      icon: 'lucide:car-taxi-front',
      variant: 'info',
      handler: () => router.push(`/external-bookings?order_id=${id}`),
    })
  }

  return {
    id,
    ref: o.order_number ?? String(o.id),
    status: o.status,
    statusLabel,
    statusClass,
    customer: o.customer?.full_name ?? o.customer?.name,
    address: addr ? [addr.street ?? addr.line1, addr.city].filter(Boolean).join(', ') : undefined,
    time: o.booking_info?.timing ?? o.booking_info?.date,
    type: 'order',
    actions,
  }
}

function tripToItem(t: Trip): ListItem {
  const s = t.kanban_state
  const statusClass = (s === 'Completed' || s === 'Fare Calculated') ? 'done'
    : s === 'Trip Started' ? 'active'
    : 'pending'
  const statusLabel = s === 'Assigned' ? 'Assigned'
    : s === 'Viewed' ? 'Viewed'
    : s === 'Trip Started' ? 'In Progress'
    : s === 'Trip Completed' ? 'Trip Done'
    : s === 'Fare Calculated' ? 'Fare Calc.'
    : s === 'Completed' ? 'Completed'
    : s

  const actions: ItemAction[] = []
  if (s === 'Assigned' || s === 'Viewed') {
    actions.push({
      label: 'View Details',
      icon: 'lucide:eye',
      variant: 'primary',
      handler: () => router.push(`/trips/${t.id}`),
    })
    actions.push({
      label: 'Navigate',
      icon: 'lucide:navigation',
      variant: 'info',
      handler: () => openNavigationMenu(t.pickup_location.latitude, t.pickup_location.longitude, t.customer_name ?? 'Customer'),
    })
  }
  if (s === 'Trip Started') {
    actions.push({
      label: 'Update Status',
      icon: 'lucide:refresh-cw',
      variant: 'success',
      handler: () => router.push(`/trips/${t.id}`),
    })
    actions.push({
      label: 'Navigate',
      icon: 'lucide:navigation',
      variant: 'info',
      handler: () => openNavigationMenu(t.drop_location.latitude, t.drop_location.longitude, t.customer_name ?? 'Customer'),
    })
  }

  return {
    id: t.id,
    ref: t.trip_number,
    status: s,
    statusLabel,
    statusClass,
    customer: t.customer_name,
    address: undefined,
    time: t.start_time
      ? new Date(t.start_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : undefined,
    fare: t.fare ? `₹${t.fare.toFixed(0)}` : undefined,
    type: 'trip',
    actions,
  }
}

// Today's full list: active first, then upcoming
const todayList = computed<ListItem[]>(() => {
  if (isBeautician.value) {
    return [
      ...ongoingOrders.value.map(orderToItem),
      ...upcomingOrders.value.filter(o => isToday(o.booking_info?.date)).map(orderToItem),
    ]
  }
  return [
    ...activeTrips.value.map(tripToItem),
    ...upcomingTrips.value.filter(t => isToday(t.created_at)).map(tripToItem),
  ]
})

/**
 * Limit the dashboard list to a focused set (top 3) to prevent clutter.
 * "View all" takes the user to the full paginated list.
 */
const displayTodayList = computed(() => todayList.value.slice(0, 3))

const nextItem = computed<ListItem | null>(() => {
  return todayList.value.find((i) => i.statusClass !== 'done') ?? null
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
        .then((d) => {
          console.log('[HomeView] Dashboard data received:', d)
          dashboard.value = d
          // If we have trips with order data, use them as a fallback/initial set for orders
          if (uType === 'beautician' && d.trips?.length > 0 && orders.value.length === 0) {
            const seen = new Set()
            const extractedOrders: any[] = []
            
            for (const t of d.trips) {
              const o = t.order_id
              if (o && typeof o === 'object' && o._id) {
                if (!seen.has(o._id)) {
                  seen.add(o._id)
                  extractedOrders.push(o)
                }
              }
            }
            
            if (extractedOrders.length > 0) {
              console.log('[HomeView] Extracted deduplicated orders:', extractedOrders.length)
              orders.value = extractedOrders
            }
          }
        })
        .catch((err) => console.error('[HomeView] Failed to fetch dashboard:', err))
    ]

    if (uType === 'beautician') {
      calls.push(
        getOrders(1, 100).then((res) => {
          const list = Array.isArray(res) ? res : (res.data ?? [])
          console.log('[HomeView] Orders received from API:', list.length)
          // Only overwrite if we didn't already extract them from trips, 
          // or if the API returned more/different relevant data
          if (list.length > 0 || orders.value.length === 0) {
            orders.value = list
          }
        }).catch((err) => console.error('[HomeView] Failed to fetch orders:', err)),
        getComplaints().then((list) => {
          console.log('[HomeView] Complaints received:', list.length)
          hasComplaints.value = list.length > 0
        }).catch((err) => console.error('[HomeView] Failed to fetch complaints:', err)),
      )
    } else {
      calls.push(
        getTrips(1, 100).then((list) => {
          console.log('[HomeView] Trips received:', list.length)
          trips.value = list
        }).catch((err) => console.error('[HomeView] Failed to fetch trips:', err)),
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

function goToDetail(item: ListItem): void {
  router.push(item.type === 'order' ? `/orders/${item.id}` : `/trips/${item.id}`)
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

/* ── KPI strip ───────────────────────────────────────────────────────────── */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.kpi-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 4px 12px;
  border-right: 1px solid var(--color-border);
  gap: 2px;
}

.kpi-card:last-child { border-right: none; }

.kpi-card__icon {
  font-size: 18px;
  margin-bottom: 2px;
}

.kpi-card--brand  .kpi-card__icon { color: var(--color-brand); }
.kpi-card--success .kpi-card__icon { color: var(--color-success); }
.kpi-card--warning .kpi-card__icon { color: var(--color-warning); }
.kpi-card--info   .kpi-card__icon { color: var(--color-info); }

.kpi-card__value {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 800;
  color: var(--color-text);
  line-height: 1;
}

.kpi-card__label {
  margin: 0;
  font-size: 10px;
  color: var(--color-text-muted);
  font-weight: 500;
  text-align: center;
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

/* ── Glance grid ─────────────────────────────────────────────────────────── */
.glance-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.glance-card {
  border-radius: var(--radius-xl);
  padding: 14px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.14s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.14s ease, box-shadow 0.14s ease;
}

.glance-card:active {
  transform: scale(0.94);
  opacity: 0.88;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.glance-card--purple { background: linear-gradient(135deg, #7c3aed 0%, #9d5cf6 100%); }
.glance-card--green  { background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); }
.glance-card--blue   { background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); }
.glance-card--orange { background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%); }

.glance-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.glance-card__icon { font-size: 20px; color: rgba(255,255,255,0.8); }

.glance-card__count {
  font-size: var(--font-size-3xl);
  font-weight: 800;
  color: #fff;
  line-height: 1;
}

.glance-card__label {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: #fff;
}

.glance-card__sub {
  margin: 2px 0 0;
  font-size: var(--font-size-xs);
  color: rgba(255,255,255,0.7);
}

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
