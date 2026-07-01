/**
 * useOrders
 *
 * Composable for fetching and managing the beautician's order list.
 */

import { computed, readonly, ref, watch } from 'vue'
import { getOrders } from '@/shared/api'
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

const SHOW_BY_TAB: Record<OrderTab, string> = {
  Confirmed: 'confirmed',
  Ongoing: 'ongoing',
  Completed: 'completed',
  Cancelled: 'cancelled',
}

export function useOrders() {
  const orders = ref<Order[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const statusCounts = ref<Record<OrderTab, number>>({
    Confirmed: 0,
    Ongoing: 0,
    Completed: 0,
    Cancelled: 0,
  })

  const statusFilter = ref<OrderTab>('Confirmed')
  const dateFilter = ref<OrderDateFilter>('today')

  const currentPage = ref(1)
  const totalPages = ref(1)
  const totalItems = ref(0)
  const hasMore = ref(false)
  const limit = 20

  async function fetchOrders(page = 1): Promise<void> {
    isLoading.value = true
    error.value = null

    const x = dateFilter.value
    const show = SHOW_BY_TAB[statusFilter.value]
    console.log('Fetching orders with filters:', { x, show, page })

    try {
      const res = await getOrders(page, limit, x, show)

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
        hasMore.value = Boolean(res.hasNextPage ?? currentPage.value < totalPages.value)
        statusCounts.value = {
          Confirmed: res.statusCounts?.confirmed ?? 0,
          Ongoing: res.statusCounts?.ongoing ?? 0,
          Completed: res.statusCounts?.completed ?? 0,
          Cancelled: res.statusCounts?.cancelled ?? 0,
        }
      } else {
        currentPage.value = 1
        totalPages.value = 1
        totalItems.value = orders.value.length
        hasMore.value = false
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load orders'
      if (page === 1) {
        orders.value = []
        currentPage.value = 1
        totalPages.value = 1
        totalItems.value = 0
        hasMore.value = false
        statusCounts.value = {
          Confirmed: 0,
          Ongoing: 0,
          Completed: 0,
          Cancelled: 0,
        }
      }
    } finally {
      isLoading.value = false
    }
  }

  const filteredOrders = computed(() => {
    return [...orders.value].sort((a, b) => {
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
    if (hasMore.value && !isLoading.value) {
      await fetchOrders(currentPage.value + 1)
    }
  }

  async function refresh(): Promise<void> {
    currentPage.value = 1
    hasMore.value = false
    await fetchOrders(1)
  }

  watch([statusFilter, dateFilter], ([, currentDate], [, previousDate]) => {
    if (currentDate === 'past' && previousDate !== 'past' && statusFilter.value === 'Confirmed') {
      statusFilter.value = 'Completed'
      void refresh()
      return
    }

    refresh()
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
    hasMore: readonly(hasMore),
    fetchOrders,
    loadMore,
    refresh,
    statusCounts: readonly(statusCounts),
  }
}
