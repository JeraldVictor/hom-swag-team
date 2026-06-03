/**
 * useOrders
 *
 * Composable for fetching and managing the beautician's order list.
 */

import { computed, readonly, ref, watch } from 'vue'
import { getOrders } from '@/shared/api'
import { formatISTDateShort } from '@/shared/lib/datetime'
import type { Order } from '@/shared/models'

export type OrderDateFilter = 'today' | 'tomorrow' | 'past'
export type OrderTab = 'Confirmed' | 'Ongoing' | 'Completed' | 'Cancelled'

const STATUS_PRIORITY: Record<string, number> = {
  confirmed: 1,
  reached_customer_place: 2,
  started: 3,
  ongoing: 4,
  'on going': 4,
  completed: 5,
  arrived_and_cancelled: 6,
  cancel_requested: 7,
  cancelled: 8,
  cancelled_and_refunded: 9,
}

const TAB_STATUS_MAP: Record<OrderTab, string[]> = {
  Confirmed: ['confirmed', 'reached_customer_place'],
  Ongoing: ['started', 'ongoing', 'on going'],
  Completed: ['completed'],
  Cancelled: ['cancelled', 'cancel_requested', 'cancelled_and_refunded', 'arrived_and_cancelled'],
}

export function useOrders() {
  const orders = ref<Order[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const statusFilter = ref<OrderTab>('Confirmed')
  const dateFilter = ref<OrderDateFilter>('today')

  const currentPage = ref(1)
  const totalPages = ref(1)
  const totalItems = ref(0)
  const limit = 20

  async function fetchOrders(page = 1): Promise<void> {
    isLoading.value = true
    error.value = null

    const nowISO = new Date().toISOString()
    const todayStr = formatISTDateShort(nowISO)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const tomorrowStr = formatISTDateShort(tomorrow.toISOString())

    let dateParam: string | undefined
    if (dateFilter.value === 'today') dateParam = todayStr
    else if (dateFilter.value === 'tomorrow') dateParam = tomorrowStr

    const statusParam = undefined
    console.log('Fetching orders with filters:', { status: statusParam, date: dateParam, page })

    try {
      const res = await getOrders(page, limit, statusParam, dateParam)

      if (page === 1) {
        orders.value = Array.isArray(res) ? res : (res.data ?? [])
      } else {
        const newOrders = Array.isArray(res) ? res : (res.data ?? [])
        orders.value = [...orders.value, ...newOrders]
      }

      if (!Array.isArray(res)) {
        currentPage.value = res.page ?? 1
        totalPages.value = res.pages ?? 1
        totalItems.value = res.total ?? orders.value.length
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load orders'
      if (page === 1) orders.value = []
    } finally {
      isLoading.value = false
    }
  }

  const filteredOrders = computed(() => {
    const list = [...orders.value] // Copy for sorting

    const nowISO = new Date().toISOString()
    const todayStr = formatISTDateShort(nowISO)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const tomorrowStr = formatISTDateShort(tomorrow.toISOString())

    // 1. Filtering
    const filtered = list.filter(o => {
      // Use booking_info.date if available, fallback to service_date or created_at
      const dateToFormat = o.booking_info?.date || o.service_date || o.created_at
      if (!dateToFormat) return false
      const sDateStr = formatISTDateShort(dateToFormat)

      const isToday = sDateStr === todayStr
      const isTomorrow = sDateStr === tomorrowStr
      const isPast = sDateStr < todayStr
      const s = o.status?.toLowerCase() || ''

      const isActive =
        s === 'ongoing' || s === 'started' || s === 'on going' || s === 'reached_customer_place'

      // Filter by date tab
      if (dateFilter.value === 'today' && !isToday && !isActive) return false
      if (dateFilter.value === 'tomorrow' && !isTomorrow) return false
      if (dateFilter.value === 'past' && !isPast) return false

      // Status filter (Tab based)
      const allowedStatuses = TAB_STATUS_MAP[statusFilter.value]
      if (!allowedStatuses.includes(s)) return false

      return true
    })

    // 2. Sorting
    return filtered.sort((a, b) => {
      const sA = a.status?.toLowerCase() || ''
      const sB = b.status?.toLowerCase() || ''

      // Priority 1: Status grouping
      const pA = STATUS_PRIORITY[sA] || 99
      const pB = STATUS_PRIORITY[sB] || 99
      if (pA !== pB) return pA - pB

      // Priority 2: Chronological (Ascending effective_start_time)
      const timeA = a.booking_info?.effective_start_time || '99:99'
      const timeB = b.booking_info?.effective_start_time || '99:99'

      if (timeA !== timeB) return timeA.localeCompare(timeB)

      // Priority 3: Fallback to order ID/Number
      return String(a.id).localeCompare(String(b.id))
    })
  })

  async function loadMore(): Promise<void> {
    if (currentPage.value < totalPages.value && !isLoading.value) {
      await fetchOrders(currentPage.value + 1)
    }
  }

  async function refresh(): Promise<void> {
    currentPage.value = 1
    await fetchOrders(1)
  }

  watch([statusFilter, dateFilter], () => {
    refresh()
  })

  const statusCounts = computed(() => {
    const counts: Record<OrderTab, number> = {
      Confirmed: 0,
      Ongoing: 0,
      Completed: 0,
      Cancelled: 0,
    }

    const nowISO = new Date().toISOString()
    const todayStr = formatISTDateShort(nowISO)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const tomorrowStr = formatISTDateShort(tomorrow.toISOString())

    for (const order of orders.value) {
      const dateToFormat = order.booking_info?.date || order.service_date || order.created_at
      if (!dateToFormat) continue

      const sDateStr = formatISTDateShort(dateToFormat)
      const isToday = sDateStr === todayStr
      const isTomorrow = sDateStr === tomorrowStr
      const isPast = sDateStr < todayStr
      const s = order.status?.toLowerCase() || ''

      const isActive =
        s === 'ongoing' || s === 'started' || s === 'on going' || s === 'reached_customer_place'

      if (dateFilter.value === 'today' && !isToday && !isActive) continue
      if (dateFilter.value === 'tomorrow' && !isTomorrow) continue
      if (dateFilter.value === 'past' && !isPast) continue

      // Map status to tab for counting
      for (const [tab, statuses] of Object.entries(TAB_STATUS_MAP)) {
        if (statuses.includes(s)) {
          counts[tab as OrderTab] += 1
          break
        }
      }
    }

    return counts
  })

  return {
    orders: readonly(orders),
    filteredOrders,
    isLoading: readonly(isLoading),
    error: readonly(error),
    statusFilter,
    dateFilter,
    currentPage,
    totalPages,
    totalItems,
    fetchOrders,
    loadMore,
    refresh,
    statusCounts,
  }
}
