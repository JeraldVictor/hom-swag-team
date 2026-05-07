<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Calendar</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="goToToday">Today</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <!-- ── Month navigation ──────────────────────────────────────────── -->
      <div class="month-nav">
        <button class="month-nav__btn" aria-label="Previous month" @click="prevMonth">
          <Icon icon="lucide:chevron-left" />
        </button>
        <span class="month-nav__label">{{ monthLabel }}</span>
        <button class="month-nav__btn" aria-label="Next month" @click="nextMonth">
          <Icon icon="lucide:chevron-right" />
        </button>
      </div>

      <!-- ── Day-of-week headers ───────────────────────────────────────── -->
      <div class="cal-grid cal-grid--header">
        <span v-for="d in DAY_NAMES" :key="d" class="cal-day-name">{{ d }}</span>
      </div>

      <!-- ── Calendar grid ─────────────────────────────────────────────── -->
      <div class="cal-grid">
        <div
          v-for="cell in calendarCells"
          :key="cell.key"
          class="cal-cell"
          :class="{
            'cal-cell--empty':    !cell.day,
            'cal-cell--today':    cell.isToday,
            'cal-cell--selected': cell.date === selectedDate,
          }"
          @click="cell.day && selectDate(cell.date)"
        >
          <span v-if="cell.day" class="cal-cell__day">{{ cell.day }}</span>
          <!-- Up to 3 dots, one per distinct event type on that day -->
          <div v-if="cell.dots.length > 0" class="cal-cell__dots" aria-hidden="true">
            <span
              v-for="dot in cell.dots"
              :key="dot"
              class="cal-cell__dot"
              :class="`cal-cell__dot--${dot}`"
            />
          </div>
        </div>
      </div>

      <!-- ── Legend ────────────────────────────────────────────────────── -->
      <div class="cal-legend">
        <div class="cal-legend__item">
          <span class="cal-cell__dot cal-cell__dot--paid_leave" />
          <span>Paid Leave</span>
        </div>
        <div class="cal-legend__item">
          <span class="cal-cell__dot cal-cell__dot--sick_leave" />
          <span>Sick Leave</span>
        </div>
        <div class="cal-legend__item">
          <span class="cal-cell__dot cal-cell__dot--ot" />
          <span>OT</span>
        </div>
        <div class="cal-legend__item">
          <span class="cal-cell__dot cal-cell__dot--weekly_off" />
          <span>Weekly Off</span>
        </div>
      </div>

      <!-- ── Loading skeleton ──────────────────────────────────────────── -->
      <template v-if="isLoading">
        <div class="events-section">
          <div class="events-section__header">
            <div class="skeleton-line skeleton-line--title" />
          </div>
          <div v-for="n in 3" :key="n" class="event-skeleton" />
        </div>
      </template>

      <!-- ── Events for selected date ──────────────────────────────────── -->
      <template v-else>
        <div class="events-section">
          <p class="events-section__heading">
            <Icon icon="lucide:calendar-days" aria-hidden="true" />
            {{ formattedSelectedDate }}
          </p>

          <template v-if="selectedEvents.length > 0">
            <div
              v-for="ev in selectedEvents"
              :key="`${ev.type}-${ev.id}`"
              class="event-card"
              :class="`event-card--${ev.type}`"
            >
              <div class="event-card__accent" />
              <div class="event-card__body">
                <div class="event-card__top">
                  <span class="event-card__icon-wrap" :class="`event-card__icon-wrap--${ev.type}`">
                    <Icon :icon="eventIcon(ev.type)" aria-hidden="true" />
                  </span>
                  <div class="event-card__info">
                    <p class="event-card__title">{{ ev.title }}</p>
                    <p v-if="ev.detail" class="event-card__detail">{{ ev.detail }}</p>
                  </div>
                  <span class="event-card__badge" :class="`event-card__badge--${ev.status}`">
                    {{ statusLabel(ev.status) }}
                  </span>
                </div>
              </div>
            </div>
          </template>

          <div v-else class="events-empty">
            <Icon icon="lucide:sun" class="events-empty__icon" aria-hidden="true" />
            <p>No events on this day</p>
          </div>
        </div>

        <!-- ── Upcoming events (next 7 days from selected date) ──────── -->
        <div v-if="upcomingEvents.length > 0" class="events-section">
          <p class="events-section__heading">
            <Icon icon="lucide:clock" aria-hidden="true" />
            Upcoming
          </p>
          <div
            v-for="ev in upcomingEvents"
            :key="`upcoming-${ev.type}-${ev.id}-${ev.date}`"
            class="event-card"
            :class="`event-card--${ev.type}`"
          >
            <div class="event-card__accent" />
            <div class="event-card__body">
              <div class="event-card__top">
                <span class="event-card__icon-wrap" :class="`event-card__icon-wrap--${ev.type}`">
                  <Icon :icon="eventIcon(ev.type)" aria-hidden="true" />
                </span>
                <div class="event-card__info">
                  <p class="event-card__title">{{ ev.title }}</p>
                  <p class="event-card__detail">{{ formatEventDate(ev.date) }}<span v-if="ev.detail"> · {{ ev.detail }}</span></p>
                </div>
                <span class="event-card__badge" :class="`event-card__badge--${ev.status}`">
                  {{ statusLabel(ev.status) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="bottom-spacer" />
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonRefresher, IonRefresherContent, onIonViewWillEnter,
} from '@ionic/vue'
import { Icon } from '@iconify/vue'
import type { CalendarEvent, CalendarEventType } from '@/shared/models'
import type { LeaveRequest } from '@/shared/models'
import type { OtRequest } from '@/shared/models'
import type { WeeklyOffRequest } from '@/shared/models'

// ── Constants ──────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ── Date helpers ───────────────────────────────────────────────────────────

const today = new Date()

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

// ── State ──────────────────────────────────────────────────────────────────

const currentYear  = ref(today.getFullYear())
const currentMonth = ref(today.getMonth()) // 0-indexed
const selectedDate = ref<string>(toDateStr(today))
const isLoading    = ref(false)

// Raw data from APIs
const leaveRequests  = ref<LeaveRequest[]>([])
const otRequests     = ref<OtRequest[]>([])
const weeklyOffReqs  = ref<WeeklyOffRequest[]>([])

// ── Computed: month label ──────────────────────────────────────────────────

const monthLabel = computed(() =>
  new Date(currentYear.value, currentMonth.value, 1)
    .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
)

// ── Computed: flatten all data into CalendarEvent[] ───────────────────────

const allEvents = computed<CalendarEvent[]>(() => {
  const events: CalendarEvent[] = []

  // Leave requests — only paid_leave and sick_leave
  for (const req of leaveRequests.value) {
    const type = req.leave_type
    if (type !== 'paid_leave' && type !== 'sick_leave') continue
    const durationLabel: Record<string, string> = {
      full_day: 'Full Day',
      first_half: 'First Half',
      second_half: 'Second Half',
    }
    events.push({
      date: req.date,
      type: type as CalendarEventType,
      title: type === 'paid_leave' ? 'Paid Leave' : 'Sick Leave',
      status: req.status,
      id: req.id ?? req._id,
      detail: durationLabel[req.duration] ?? req.duration,
    })
  }

  // OT requests
  for (const req of otRequests.value) {
    events.push({
      date: req.date,
      type: 'ot',
      title: 'Overtime',
      status: req.status,
      id: req.id ?? req._id,
      detail: `${req.hours} hr${req.hours !== 1 ? 's' : ''}`,
    })
  }

  // Weekly off requests
  for (const req of weeklyOffReqs.value) {
    const date = req.date ?? ''
    if (!date) continue
    const dayLabel = req.day_of_week.charAt(0).toUpperCase() + req.day_of_week.slice(1)
    events.push({
      date,
      type: 'weekly_off',
      title: 'Weekly Off',
      status: req.status,
      id: req.id ?? req._id,
      detail: dayLabel,
    })
  }

  return events
})

// ── Computed: events keyed by date ────────────────────────────────────────

const eventsByDate = computed<Record<string, CalendarEvent[]>>(() => {
  const map: Record<string, CalendarEvent[]> = {}
  for (const ev of allEvents.value) {
    if (!ev.date) continue
    if (!map[ev.date]) map[ev.date] = []
    map[ev.date].push(ev)
  }
  return map
})

// ── Computed: calendar grid cells ─────────────────────────────────────────

interface CalCell {
  key: string
  day: number | null
  date: string
  isToday: boolean
  /** Unique event types present on this day — used for dot rendering */
  dots: CalendarEventType[]
}

const calendarCells = computed<CalCell[]>(() => {
  const cells: CalCell[] = []
  const firstDay = new Date(currentYear.value, currentMonth.value, 1)
  const lastDay  = new Date(currentYear.value, currentMonth.value + 1, 0)
  const todayStr = toDateStr(today)

  // Leading empty cells to align with day-of-week
  for (let i = 0; i < firstDay.getDay(); i++) {
    cells.push({ key: `empty-${i}`, day: null, date: '', isToday: false, dots: [] })
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = toDateStr(new Date(currentYear.value, currentMonth.value, d))
    const evs  = eventsByDate.value[date] ?? []

    // Deduplicate types for dots (max 3 shown)
    const dotTypes = [...new Set(evs.map((e) => e.type))].slice(0, 3)

    cells.push({
      key: date,
      day: d,
      date,
      isToday: date === todayStr,
      dots: dotTypes,
    })
  }

  return cells
})

// ── Computed: events for selected date ────────────────────────────────────

const selectedEvents = computed<CalendarEvent[]>(() =>
  selectedDate.value ? (eventsByDate.value[selectedDate.value] ?? []) : []
)

// ── Computed: upcoming events (next 30 days from selected, excluding selected) ──

const upcomingEvents = computed<CalendarEvent[]>(() => {
  const from = addDays(selectedDate.value, 1)
  const to   = addDays(selectedDate.value, 30)
  return allEvents.value
    .filter((ev) => ev.date > selectedDate.value && ev.date >= from && ev.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10) // cap at 10 upcoming items
})

// ── Computed: formatted selected date label ────────────────────────────────

const formattedSelectedDate = computed(() => {
  if (!selectedDate.value) return ''
  return new Date(selectedDate.value + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
})

// ── Helpers ────────────────────────────────────────────────────────────────

function eventIcon(type: CalendarEventType): string {
  const map: Record<CalendarEventType, string> = {
    paid_leave:  'lucide:umbrella',
    sick_leave:  'lucide:thermometer',
    ot:          'lucide:clock-plus',
    weekly_off:  'lucide:calendar-x-2',
  }
  return map[type] ?? 'lucide:calendar'
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    requested: 'Pending',
    approved:  'Approved',
    rejected:  'Rejected',
  }
  return map[status] ?? status
}

function formatEventDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

// ── Dummy data (replace with API calls when backend is ready) ─────────────

/**
 * Returns an ISO date string offset by `n` days from today.
 * Negative n = past, positive n = future.
 */
function relDate(n: number): string {
  return addDays(toDateStr(today), n)
}

const DUMMY_LEAVE_REQUESTS: LeaveRequest[] = [
  // Past — approved paid leave
  { id: '1', date: relDate(-10), leave_type: 'paid_leave', duration: 'full_day',    status: 'approved' },
  // Past — approved sick leave
  { id: '2', date: relDate(-5),  leave_type: 'sick_leave', duration: 'first_half',  status: 'approved' },
  // This week — pending paid leave
  { id: '3', date: relDate(2),   leave_type: 'paid_leave', duration: 'full_day',    status: 'requested' },
  // Next week — pending sick leave
  { id: '4', date: relDate(8),   leave_type: 'sick_leave', duration: 'second_half', status: 'requested' },
  // Further out — approved paid leave
  { id: '5', date: relDate(15),  leave_type: 'paid_leave', duration: 'full_day',    status: 'approved' },
  // Rejected — won't show as approved but still visible
  { id: '6', date: relDate(20),  leave_type: 'paid_leave', duration: 'full_day',    status: 'rejected' },
]

const DUMMY_OT_REQUESTS: OtRequest[] = [
  // Past — approved OT
  { id: '10', date: relDate(-7),  hours: 2,   status: 'approved' },
  // Past — approved OT
  { id: '11', date: relDate(-3),  hours: 1.5, status: 'approved' },
  // Today — pending OT
  { id: '12', date: relDate(0),   hours: 3,   status: 'requested' },
  // Future — pending OT
  { id: '13', date: relDate(5),   hours: 2,   status: 'requested' },
  // Future — approved OT
  { id: '14', date: relDate(12),  hours: 1,   status: 'approved' },
]

const DUMMY_WEEKLY_OFF_REQUESTS: WeeklyOffRequest[] = [
  // Past Sunday — approved
  { id: '20', day_of_week: 'sunday', date: relDate(-7),  status: 'approved' },
  // Upcoming Sunday — approved
  { id: '21', day_of_week: 'sunday', date: relDate(7),   status: 'approved' },
  // Sunday after — pending
  { id: '22', day_of_week: 'sunday', date: relDate(14),  status: 'requested' },
  // A Saturday — approved
  { id: '23', day_of_week: 'saturday', date: relDate(6), status: 'approved' },
]

// ── Data loading ───────────────────────────────────────────────────────────

function loadDummyData(): void {
  // Simulate a brief loading flash so the skeleton is visible
  isLoading.value = true
  setTimeout(() => {
    leaveRequests.value = DUMMY_LEAVE_REQUESTS
    otRequests.value    = DUMMY_OT_REQUESTS
    weeklyOffReqs.value = DUMMY_WEEKLY_OFF_REQUESTS
    isLoading.value     = false
  }, 400)
}

// ── Navigation ─────────────────────────────────────────────────────────────

function selectDate(date: string): void {
  selectedDate.value = date
}

function goToToday(): void {
  currentYear.value  = today.getFullYear()
  currentMonth.value = today.getMonth()
  selectedDate.value = toDateStr(today)
}

function prevMonth(): void {
  if (currentMonth.value === 0) { currentMonth.value = 11; currentYear.value-- }
  else currentMonth.value--
}

function nextMonth(): void {
  if (currentMonth.value === 11) { currentMonth.value = 0; currentYear.value++ }
  else currentMonth.value++
}

function handleRefresh(event: CustomEvent): void {
  loadDummyData()
  // Give the timeout a moment then complete the refresher
  setTimeout(() => {
    ;(event.target as HTMLIonRefresherElement).complete()
  }, 500)
}

// ── Lifecycle ──────────────────────────────────────────────────────────────

// Dummy data is static — no need to re-fetch on month change.
// When wired to real APIs, swap loadDummyData → fetchAll here.
watch([currentYear, currentMonth], () => { /* no-op with dummy data */ })

onMounted(loadDummyData)
onIonViewWillEnter(() => {
  if (leaveRequests.value.length === 0 && otRequests.value.length === 0) loadDummyData()
})
</script>

<style scoped>
/* ── Month navigation ────────────────────────────────────────────────────── */

.month-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 6px;
}

.month-nav__btn {
  background: none;
  border: none;
  font-size: 22px;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 6px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s ease;
}

.month-nav__btn:active { background: var(--color-background); }

.month-nav__label {
  font-size: var(--font-size-lg);
  font-weight: 800;
  color: var(--color-text);
}

/* ── Calendar grid ───────────────────────────────────────────────────────── */

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 0 6px;
  gap: 1px;
}

.cal-grid--header { margin-bottom: 2px; }

.cal-day-name {
  text-align: center;
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-muted);
  padding: 6px 0;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.cal-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 5px 2px 4px;
  border-radius: var(--radius-lg);
  cursor: pointer;
  min-height: 52px;
  gap: 3px;
  transition: background 0.12s ease;
  -webkit-tap-highlight-color: transparent;
  position: relative;
}

.cal-cell--empty { cursor: default; pointer-events: none; }
.cal-cell:not(.cal-cell--empty):active { background: var(--color-background); }

/* Today ring */
.cal-cell--today .cal-cell__day {
  background: var(--color-brand);
  color: #fff;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}

/* Selected (non-today) */
.cal-cell--selected:not(.cal-cell--today) {
  background: var(--color-brand-pale);
}

.cal-cell--selected:not(.cal-cell--today) .cal-cell__day {
  color: var(--color-brand);
  font-weight: 800;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1.5px solid var(--color-brand);
}

.cal-cell__day {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text);
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Dots row */
.cal-cell__dots {
  display: flex;
  gap: 3px;
  justify-content: center;
  min-height: 6px;
}

.cal-cell__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

/* Dot colours — one per event type */
.cal-cell__dot--paid_leave  { background: #f59e0b; } /* amber */
.cal-cell__dot--sick_leave  { background: #ef4444; } /* red   */
.cal-cell__dot--ot          { background: #8b5cf6; } /* violet */
.cal-cell__dot--weekly_off  { background: #10b981; } /* emerald */

/* ── Legend ──────────────────────────────────────────────────────────────── */

.cal-legend {
  display: flex;
  gap: 14px;
  justify-content: center;
  padding: 10px 16px 6px;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 4px;
}

.cal-legend__item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  font-weight: 500;
}

/* ── Events section ──────────────────────────────────────────────────────── */

.events-section {
  padding: 14px 16px 0;
}

.events-section__heading {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 10px;
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.7px;
}

/* ── Event card ──────────────────────────────────────────────────────────── */

.event-card {
  display: flex;
  align-items: stretch;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  margin-bottom: 8px;
}

.event-card__accent {
  width: 4px;
  flex-shrink: 0;
}

/* Accent colours per type */
.event-card--paid_leave  .event-card__accent { background: #f59e0b; }
.event-card--sick_leave  .event-card__accent { background: #ef4444; }
.event-card--ot          .event-card__accent { background: #8b5cf6; }
.event-card--weekly_off  .event-card__accent { background: #10b981; }

.event-card__body {
  flex: 1;
  padding: 12px 12px 12px 10px;
}

.event-card__top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.event-card__icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.event-card__icon-wrap--paid_leave  { background: #fef3c7; color: #d97706; }
.event-card__icon-wrap--sick_leave  { background: #fee2e2; color: #dc2626; }
.event-card__icon-wrap--ot          { background: #ede9fe; color: #7c3aed; }
.event-card__icon-wrap--weekly_off  { background: #d1fae5; color: #059669; }

.event-card__info {
  flex: 1;
  min-width: 0;
}

.event-card__title {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text);
}

.event-card__detail {
  margin: 2px 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

/* Status badge */
.event-card__badge {
  font-size: var(--font-size-xs);
  font-weight: 700;
  padding: 3px 9px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.event-card__badge--approved  { background: #d1fae5; color: #065f46; }
.event-card__badge--requested { background: #fef3c7; color: #92400e; }
.event-card__badge--rejected  { background: #fee2e2; color: #991b1b; }

/* ── Empty state ─────────────────────────────────────────────────────────── */

.events-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 24px 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.events-empty__icon {
  font-size: 28px;
  opacity: 0.5;
}

/* ── Skeleton ────────────────────────────────────────────────────────────── */

.skeleton-line {
  border-radius: var(--radius-md);
  background: linear-gradient(90deg, var(--color-border) 25%, var(--color-background) 50%, var(--color-border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.skeleton-line--title { height: 16px; width: 40%; margin-bottom: 10px; }

.event-skeleton {
  height: 64px;
  border-radius: var(--radius-xl);
  margin-bottom: 8px;
  background: linear-gradient(90deg, var(--color-border) 25%, var(--color-background) 50%, var(--color-border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.bottom-spacer { height: 24px; }

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
