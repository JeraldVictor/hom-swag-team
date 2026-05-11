<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button class="header-icon-btn" aria-label="Open menu" @click="openMenu">
            <Icon icon="lucide:menu" class="header-icon" />
          </ion-button>
        </ion-buttons>
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
      <div class="month-nav anim-fade-up">
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
      <Transition name="cal-slide" mode="out-in">
        <div :key="`${currentYear}-${currentMonth}`" class="cal-grid">
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
      </Transition>

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
          <span class="cal-cell__dot cal-cell__dot--holiday" />
          <span>Holiday</span>
        </div>
      </div>

      <!-- ── Loading skeleton ──────────────────────────────────────────── -->
      <template v-if="isLoading">
        <div class="events-section">
          <div class="skeleton-line skeleton-line--title" />
          <div v-for="n in 3" :key="n" class="event-skeleton" />
        </div>
      </template>

      <!-- ── Events for selected date ──────────────────────────────────── -->
      <template v-else>
        <Transition name="events-fade" mode="out-in">
          <div :key="selectedDate" class="events-section">
            <p class="events-section__heading">
              <Icon icon="lucide:calendar-days" aria-hidden="true" />
              {{ formattedSelectedDate }}
            </p>

            <template v-if="selectedEvents.length > 0">
              <div
                v-for="(ev, i) in selectedEvents"
                :key="`${ev.type}-${ev.id}`"
                class="event-card anim-fade-up"
                :class="`event-card--${ev.type}`"
                :style="{ animationDelay: `${i * 0.06}s` }"
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
                    <span v-if="ev.status" class="event-card__badge" :class="`event-card__badge--${ev.status}`">
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
        </Transition>

        <!-- ── Upcoming events ────────────────────────────────────────── -->
        <div v-if="upcomingEvents.length > 0" class="events-section">
          <p class="events-section__heading">
            <Icon icon="lucide:clock" aria-hidden="true" />
            Upcoming
          </p>
          <div
            v-for="(ev, i) in upcomingEvents"
            :key="`upcoming-${ev.type}-${ev.id}-${ev.date}`"
            class="event-card anim-fade-up"
            :class="`event-card--${ev.type}`"
            :style="{ animationDelay: `${i * 0.05}s` }"
          >
            <div class="event-card__accent" />
            <div class="event-card__body">
              <div class="event-card__top">
                <span class="event-card__icon-wrap" :class="`event-card__icon-wrap--${ev.type}`">
                  <Icon :icon="eventIcon(ev.type)" aria-hidden="true" />
                </span>
                <div class="event-card__info">
                  <p class="event-card__title">{{ ev.title }}</p>
                  <p class="event-card__detail">
                    {{ formatEventDate(ev.date) }}<span v-if="ev.detail"> · {{ ev.detail }}</span>
                  </p>
                </div>
                <span v-if="ev.status" class="event-card__badge" :class="`event-card__badge--${ev.status}`">
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
import { onIonViewWillEnter } from '@ionic/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { getCalendar } from '@/shared/api'
import { useDrawer, useToast } from '@/shared/composables'

// ── Types ──────────────────────────────────────────────────────────────────

type EventType = 'paid_leave' | 'sick_leave' | 'loss_of_pay' | 'block_time' | 'holiday'

interface CalEvent {
  date: string
  type: EventType
  title: string
  status?: string
  id?: string
  detail?: string
}

// ── Constants ──────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ── Date helpers ───────────────────────────────────────────────────────────

const today = new Date()

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

function monthStartStr(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-01`
}

function monthEndStr(year: number, month: number): string {
  const last = new Date(year, month + 1, 0)
  return toDateStr(last)
}

// ── State ──────────────────────────────────────────────────────────────────

const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth())
const selectedDate = ref(toDateStr(today))
const isLoading = ref(false)
const allEvents = ref<CalEvent[]>([])

const { showError } = useToast()
const { openDrawer } = useDrawer()

function openMenu(): void {
  openDrawer()
}

// ── Computed: month label ──────────────────────────────────────────────────

const monthLabel = computed(() =>
  new Date(currentYear.value, currentMonth.value, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
)

// ── Computed: events keyed by date ────────────────────────────────────────

const eventsByDate = computed<Record<string, CalEvent[]>>(() => {
  const map: Record<string, CalEvent[]> = {}
  for (const ev of allEvents.value) {
    if (!ev.date) continue
    if (!map[ev.date]) map[ev.date] = []
    map[ev.date].push(ev)
  }
  return map
})

// ── Computed: calendar grid ────────────────────────────────────────────────

interface CalCell {
  key: string
  day: number | null
  date: string
  isToday: boolean
  dots: EventType[]
}

const calendarCells = computed<CalCell[]>(() => {
  const cells: CalCell[] = []
  const firstDay = new Date(currentYear.value, currentMonth.value, 1)
  const lastDay = new Date(currentYear.value, currentMonth.value + 1, 0)
  const todayStr = toDateStr(today)

  for (let i = 0; i < firstDay.getDay(); i++) {
    cells.push({ key: `empty-${i}`, day: null, date: '', isToday: false, dots: [] })
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = toDateStr(new Date(currentYear.value, currentMonth.value, d))
    const evs = eventsByDate.value[date] ?? []
    const dotTypes = [...new Set(evs.map(e => e.type))].slice(0, 3)
    cells.push({ key: date, day: d, date, isToday: date === todayStr, dots: dotTypes })
  }

  return cells
})

// ── Computed: selected date events ────────────────────────────────────────

const selectedEvents = computed<CalEvent[]>(() =>
  selectedDate.value ? (eventsByDate.value[selectedDate.value] ?? []) : []
)

const upcomingEvents = computed<CalEvent[]>(() => {
  const from = addDays(selectedDate.value, 1)
  const to = addDays(selectedDate.value, 30)
  return allEvents.value
    .filter(ev => ev.date > selectedDate.value && ev.date >= from && ev.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10)
})

const formattedSelectedDate = computed(() => {
  if (!selectedDate.value) return ''
  return new Date(`${selectedDate.value}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
})

// ── Data loading ───────────────────────────────────────────────────────────

async function fetchCalendar(): Promise<void> {
  isLoading.value = true
  try {
    const start = monthStartStr(currentYear.value, currentMonth.value)
    const end = monthEndStr(currentYear.value, currentMonth.value)
    const data = await getCalendar(start, end)

    const events: CalEvent[] = []

    // Map leave requests
    const leaves = (data.leaves ?? []) as unknown as Array<Record<string, unknown>>
    for (const req of leaves) {
      const type = req.leave_type as string
      if (!type || !req.date) continue
      const durationMap: Record<string, string> = {
        full_day: 'Full Day',
        first_half: 'First Half',
        second_half: 'Second Half',
      }
      events.push({
        date: req.date as string,
        type: type as EventType,
        title:
          type === 'paid_leave'
            ? 'Paid Leave'
            : type === 'sick_leave'
              ? 'Sick Leave'
              : type === 'loss_of_pay'
                ? 'Loss of Pay'
                : 'Block Time',
        status: req.status as string,
        id: String(req._id ?? req.id ?? ''),
        detail: durationMap[req.duration as string] ?? (req.duration as string),
      })
    }

    // Map holidays
    const holidays = (data.holidays ?? []) as unknown as Array<Record<string, unknown>>
    for (const h of holidays) {
      if (!h.date) continue
      events.push({
        date: h.date as string,
        type: 'holiday',
        title: (h.name as string) ?? 'Holiday',
        id: String(h._id ?? h.id ?? ''),
      })
    }

    allEvents.value = events
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Failed to load calendar')
  } finally {
    isLoading.value = false
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function eventIcon(type: EventType): string {
  const map: Record<EventType, string> = {
    paid_leave: 'lucide:umbrella',
    sick_leave: 'lucide:thermometer',
    loss_of_pay: 'lucide:minus-circle',
    block_time: 'lucide:ban',
    holiday: 'lucide:party-popper',
  }
  return map[type] ?? 'lucide:calendar'
}

function statusLabel(status: string): string {
  return { requested: 'Pending', approved: 'Approved', rejected: 'Rejected' }[status] ?? status
}

function formatEventDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

// ── Navigation ─────────────────────────────────────────────────────────────

function selectDate(date: string): void {
  selectedDate.value = date
}

function goToToday(): void {
  currentYear.value = today.getFullYear()
  currentMonth.value = today.getMonth()
  selectedDate.value = toDateStr(today)
}

function prevMonth(): void {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else currentMonth.value--
}

function nextMonth(): void {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else currentMonth.value++
}

async function handleRefresh(event: CustomEvent): Promise<void> {
  await fetchCalendar()
  ;(event.target as HTMLIonRefresherElement).complete()
}

// ── Lifecycle ──────────────────────────────────────────────────────────────

watch([currentYear, currentMonth], fetchCalendar)

onMounted(fetchCalendar)
onIonViewWillEnter(() => {
  if (allEvents.value.length === 0) fetchCalendar()
})
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
  transition: background 0.15s ease, transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.month-nav__btn:active {
  background: var(--color-background);
  transform: scale(0.88);
}

.month-nav__label {
  font-size: var(--font-size-lg);
  font-weight: 800;
  color: var(--color-text);
}

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
  transition: background 0.12s ease, transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1);
  -webkit-tap-highlight-color: transparent;
}

.cal-cell--empty { cursor: default; pointer-events: none; }
.cal-cell:not(.cal-cell--empty):active {
  background: var(--color-background);
  transform: scale(0.88);
}

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

.cal-cell--selected:not(.cal-cell--today) { background: var(--color-brand-pale); }

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

.cal-cell__dot--paid_leave  { background: #f59e0b; }
.cal-cell__dot--sick_leave  { background: #ef4444; }
.cal-cell__dot--loss_of_pay { background: #6b7280; }
.cal-cell__dot--block_time  { background: #8b5cf6; }
.cal-cell__dot--holiday     { background: #10b981; }

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

.events-section { padding: 14px 16px 0; }

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

.event-card {
  display: flex;
  align-items: stretch;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  margin-bottom: 8px;
}

.event-card__accent { width: 4px; flex-shrink: 0; }
.event-card--paid_leave  .event-card__accent { background: #f59e0b; }
.event-card--sick_leave  .event-card__accent { background: #ef4444; }
.event-card--loss_of_pay .event-card__accent { background: #6b7280; }
.event-card--block_time  .event-card__accent { background: #8b5cf6; }
.event-card--holiday     .event-card__accent { background: #10b981; }

.event-card__body { flex: 1; padding: 12px 12px 12px 10px; }

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
.event-card__icon-wrap--loss_of_pay { background: #f3f4f6; color: #6b7280; }
.event-card__icon-wrap--block_time  { background: #ede9fe; color: #7c3aed; }
.event-card__icon-wrap--holiday     { background: #d1fae5; color: #059669; }

.event-card__info { flex: 1; min-width: 0; }

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

.events-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 24px 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.events-empty__icon { font-size: 28px; opacity: 0.5; }

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

/* ── Calendar slide transition (month change) ────────────────────────────── */

.cal-slide-enter-active,
.cal-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.cal-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.cal-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* ── Events fade transition (date selection) ─────────────────────────────── */

.events-fade-enter-active,
.events-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.events-fade-enter-from,
.events-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

/* ── Entrance animation for event cards ──────────────────────────────────── */

.anim-fade-up {
  animation: anim-slide-up 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes anim-slide-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Month nav entrance ──────────────────────────────────────────────────── */

.anim-fade-up {
  animation: anim-slide-up 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
