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

      <!-- Month navigation -->
      <div class="month-nav">
        <button class="month-nav__btn" aria-label="Previous month" @click="prevMonth">
          <Icon icon="lucide:chevron-left" />
        </button>
        <span class="month-nav__label">{{ monthLabel }}</span>
        <button class="month-nav__btn" aria-label="Next month" @click="nextMonth">
          <Icon icon="lucide:chevron-right" />
        </button>
      </div>

      <!-- Day-of-week headers -->
      <div class="cal-grid cal-grid--header">
        <span v-for="d in dayNames" :key="d" class="cal-day-name">{{ d }}</span>
      </div>

      <!-- Calendar grid -->
      <div class="cal-grid">
        <div
          v-for="cell in calendarCells"
          :key="cell.key"
          class="cal-cell"
          :class="{
            'cal-cell--empty': !cell.day,
            'cal-cell--today': cell.isToday,
            'cal-cell--selected': cell.date === selectedDate,
            'cal-cell--has-events': cell.events.length > 0,
          }"
          @click="cell.day && selectDate(cell.date)"
        >
          <span v-if="cell.day" class="cal-cell__day">{{ cell.day }}</span>
          <div v-if="cell.events.length > 0" class="cal-cell__dots">
            <span
              v-for="(ev, i) in cell.events.slice(0, 3)"
              :key="i"
              class="cal-cell__dot"
              :class="`cal-cell__dot--${ev.type}`"
            />
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div class="cal-legend">
        <div class="cal-legend__item">
          <span class="cal-cell__dot cal-cell__dot--leave" />
          <span>Leave</span>
        </div>
        <div class="cal-legend__item">
          <span class="cal-cell__dot cal-cell__dot--order" />
          <span>Order</span>
        </div>
        <div class="cal-legend__item">
          <span class="cal-cell__dot cal-cell__dot--trip" />
          <span>Trip</span>
        </div>
        <div class="cal-legend__item">
          <span class="cal-cell__dot cal-cell__dot--holiday" />
          <span>Holiday</span>
        </div>
      </div>

      <!-- Selected date events -->
      <div v-if="selectedDate" class="events-panel">
        <p class="events-panel__title">{{ formattedSelectedDate }}</p>

        <div v-if="isLoading" class="events-loading">
          <div class="events-loading__spinner" />
        </div>

        <template v-else-if="selectedEvents.length > 0">
          <div
            v-for="(ev, i) in selectedEvents"
            :key="i"
            class="event-item"
            :class="`event-item--${ev.type}`"
          >
            <div class="event-item__dot" />
            <div class="event-item__body">
              <p class="event-item__title">{{ ev.title ?? formatEventType(ev.type) }}</p>
              <p v-if="ev.status" class="event-item__status">{{ ev.status }}</p>
            </div>
          </div>
        </template>

        <p v-else class="events-empty">No events on this day.</p>
      </div>
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
import { getCalendar } from '@/shared/api'
import type { CalendarData, CalendarEvent } from '@/shared/models'

const today = new Date()
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth()) // 0-indexed
const selectedDate = ref<string>(toDateStr(today))
const calendarData = ref<CalendarData | null>(null)
const isLoading = ref(false)

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const monthLabel = computed(() => {
  return new Date(currentYear.value, currentMonth.value, 1)
    .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
})

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function monthStart(): Date {
  return new Date(currentYear.value, currentMonth.value, 1)
}

function monthEnd(): Date {
  return new Date(currentYear.value, currentMonth.value + 1, 0)
}

// Flatten all events from calendarData into a map keyed by date string
const eventsByDate = computed<Record<string, CalendarEvent[]>>(() => {
  const map: Record<string, CalendarEvent[]> = {}
  if (!calendarData.value) return map

  const addEvents = (list: CalendarEvent[] | undefined, type: CalendarEvent['type']) => {
    if (!list) return
    list.forEach((ev) => {
      const d = ev.date
      if (!d) return
      if (!map[d]) map[d] = []
      map[d].push({ ...ev, type })
    })
  }

  addEvents(calendarData.value.leaves as CalendarEvent[], 'leave')
  addEvents(calendarData.value.orders as CalendarEvent[], 'order')
  addEvents(calendarData.value.trips as CalendarEvent[], 'trip')
  addEvents(calendarData.value.holidays as CalendarEvent[], 'holiday')

  return map
})

interface CalCell {
  key: string
  day: number | null
  date: string
  isToday: boolean
  events: CalendarEvent[]
}

const calendarCells = computed<CalCell[]>(() => {
  const cells: CalCell[] = []
  const start = monthStart()
  const end = monthEnd()
  const todayStr = toDateStr(today)

  // Leading empty cells
  for (let i = 0; i < start.getDay(); i++) {
    cells.push({ key: `empty-${i}`, day: null, date: '', isToday: false, events: [] })
  }

  for (let d = 1; d <= end.getDate(); d++) {
    const date = toDateStr(new Date(currentYear.value, currentMonth.value, d))
    cells.push({
      key: date,
      day: d,
      date,
      isToday: date === todayStr,
      events: eventsByDate.value[date] ?? [],
    })
  }

  return cells
})

const selectedEvents = computed<CalendarEvent[]>(() =>
  selectedDate.value ? (eventsByDate.value[selectedDate.value] ?? []) : []
)

const formattedSelectedDate = computed(() => {
  if (!selectedDate.value) return ''
  return new Date(selectedDate.value + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
})

async function fetchCalendar(): Promise<void> {
  isLoading.value = true
  try {
    const start = toDateStr(monthStart())
    const end = toDateStr(monthEnd())
    calendarData.value = await getCalendar(start, end)
  } catch {
    // non-critical — show empty calendar
  } finally {
    isLoading.value = false
  }
}

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
  } else {
    currentMonth.value--
  }
}

function nextMonth(): void {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

function formatEventType(type: string): string {
  const map: Record<string, string> = {
    leave: 'Leave', order: 'Order', trip: 'Trip', holiday: 'Holiday',
  }
  return map[type] ?? type
}

async function handleRefresh(event: CustomEvent): Promise<void> {
  await fetchCalendar()
  ;(event.target as HTMLIonRefresherElement).complete()
}

// Re-fetch when month changes
watch([currentYear, currentMonth], fetchCalendar)

onMounted(fetchCalendar)
onIonViewWillEnter(() => {
  if (!calendarData.value) fetchCalendar()
})
</script>

<style scoped>
/* Month nav */
.month-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 4px;
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
}

.month-nav__btn:active { background: var(--color-background); }

.month-nav__label {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text);
}

/* Calendar grid */
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 0 8px;
  gap: 2px;
}

.cal-grid--header { margin-bottom: 4px; }

.cal-day-name {
  text-align: center;
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-muted);
  padding: 6px 0;
  text-transform: uppercase;
}

.cal-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 6px 2px 4px;
  border-radius: var(--radius-lg);
  cursor: pointer;
  min-height: 48px;
  gap: 3px;
  transition: background 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.cal-cell--empty { cursor: default; }
.cal-cell:not(.cal-cell--empty):active { background: var(--color-background); }

.cal-cell--today .cal-cell__day {
  background: var(--color-brand);
  color: #fff;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cal-cell--selected:not(.cal-cell--today) {
  background: var(--color-brand-pale);
}

.cal-cell--selected:not(.cal-cell--today) .cal-cell__day {
  color: var(--color-brand);
  font-weight: 700;
}

.cal-cell__day {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cal-cell__dots {
  display: flex;
  gap: 2px;
  justify-content: center;
}

.cal-cell__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  display: inline-block;
}

.cal-cell__dot--leave    { background: var(--color-warning); }
.cal-cell__dot--order    { background: var(--color-brand); }
.cal-cell__dot--trip     { background: var(--color-info); }
.cal-cell__dot--holiday  { background: var(--color-success); }

/* Legend */
.cal-legend {
  display: flex;
  gap: 16px;
  justify-content: center;
  padding: 8px 16px 4px;
  flex-wrap: wrap;
}

.cal-legend__item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

/* Events panel */
.events-panel {
  margin: 12px 16px 24px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 14px 16px;
}

.events-panel__title {
  margin: 0 0 12px;
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text);
}

.events-loading {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}

.events-loading__spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-brand);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.event-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
}

.event-item:last-child { border-bottom: none; }

.event-item__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}

.event-item--leave .event-item__dot    { background: var(--color-warning); }
.event-item--order .event-item__dot    { background: var(--color-brand); }
.event-item--trip .event-item__dot     { background: var(--color-info); }
.event-item--holiday .event-item__dot  { background: var(--color-success); }

.event-item__title {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
}

.event-item__status {
  margin: 2px 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  text-transform: capitalize;
}

.events-empty {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  text-align: center;
  padding: 8px 0;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
