/**
 * useOrders
 *
 * Composable for fetching and managing the beautician's order list.
 */

import { ref, readonly, computed, watch } from 'vue'
import { getOrders } from '@/shared/api'
import type { Order, OrderStatus } from '@/shared/models'
import { formatISTDateShort } from '@/shared/lib/datetime'

export type OrderDateFilter = 'today' | 'tomorrow' | 'past' | 'all'

const STATUS_PRIORITY: Record<string, number> = {
  confirmed: 1,
  started: 2,
  ongoing: 3,
  'on going': 3,
  completed: 4,
  arrived_and_cancelled: 5,
  cancelled: 6,
  cancelled_and_refunded: 7,
}

export function useOrders() {
  const orders = ref<Order[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  const statusFilter = ref<OrderStatus | 'All'>('All')
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
    const tomorrow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000)
    const tomorrowStr = formatISTDateShort(tomorrow.toISOString())

    let dateParam: string | undefined
    if (dateFilter.value === 'today') dateParam = todayStr
    else if (dateFilter.value === 'tomorrow') dateParam = tomorrowStr

    const statusParam = (statusFilter.value === 'All' || statusFilter.value === 'Cancelled') ? undefined : statusFilter.value.toLowerCase()

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
    let list = [...orders.value] // Copy for sorting

    const nowISO = new Date().toISOString()
    const todayStr = formatISTDateShort(nowISO)
    const tomorrow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000)
    const tomorrowStr = formatISTDateShort(tomorrow.toISOString())

    const allowedStatuses = ['confirmed', 'assigned', 'completed', 'on going', 'ongoing', 'started', 'arrived_and_cancelled', 'cancelled', 'cancelled_and_refunded']

    // 1. Filtering
    const filtered = list.filter(o => {
      // Use booking_info.date if available, fallback to service_date or created_at
      const dateToFormat = o.booking_info?.date || o.service_date || o.created_at
      if (!dateToFormat) return false
      const sDateStr = formatISTDateShort(dateToFormat)
      
      const isToday = sDateStr === todayStr
      const isTomorrow = sDateStr === tomorrowStr
      const isPast = sDateStr < todayStr
      const isFuture = sDateStr > tomorrowStr
      const s = o.status?.toLowerCase()
      const isCompleted = s === 'completed' || s === 'arrived_and_cancelled' || s === 'cancelled' || s === 'cancelled_and_refunded'

      // Filter by tab
      if (dateFilter.value === 'today' && !isToday) return false
      if (dateFilter.value === 'tomorrow' && !isTomorrow) return false
      if (dateFilter.value === 'past' && !isPast) return false
      
      // Additional business rules for 'past' view (usually only want to see work history)
      if (dateFilter.value === 'past' && !isCompleted) return false
      
      // Status filter
      if (!allowedStatuses.includes(s)) return false
      if (statusFilter.value === 'Cancelled') {
        const isAnyCancelled = s === 'cancelled' || s === 'arrived_and_cancelled' || s === 'cancelled_and_refunded'
        if (!isAnyCancelled) return false
      } else if (statusFilter.value !== 'All' && s !== statusFilter.value.toLowerCase()) {
        return false
      }
      
      return true
    })

    // 2. Sorting
    return filtered.sort((a, b) => {
      const sA = a.status?.toLowerCase() || ''
      const sB = b.status?.toLowerCase() || ''

      // Priority 1: Status grouping (Requested order: Confirmed -> Started -> Ongoing -> Completed)
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
  }
}
