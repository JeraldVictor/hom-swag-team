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
    // 'past' and 'all' might need different server-side handling or multi-fetch
    // For now, let's pass specific dates or handle 'past' specially if the server supports it

    const statusParam = statusFilter.value === 'All' ? undefined : statusFilter.value.toLowerCase()

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

  // Business rules still applied locally to handle complex 'past completed' logic 
  // and status exclusions not easily done via a single 'status' param
  const filteredOrders = computed(() => {
    let list = orders.value

    const nowISO = new Date().toISOString()
    const todayStr = formatISTDateShort(nowISO)
    const tomorrow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000)
    const tomorrowStr = formatISTDateShort(tomorrow.toISOString())

    const allowedStatuses = ['confirmed', 'assigned', 'completed', 'on going', 'ongoing', 'started']

    return list.filter(o => {
      const dateToFormat = o.service_date || o.created_at
      if (!dateToFormat) return false
      const sDateStr = formatISTDateShort(dateToFormat)
      
      const isToday = sDateStr === todayStr
      const isTomorrow = sDateStr === tomorrowStr
      const isPast = sDateStr < todayStr
      const isFuture = sDateStr > tomorrowStr
      const s = o.status?.toLowerCase()
      const isCompleted = s === 'completed'

      // Business rule: Only Today, Tomorrow, or Past Completed
      if (!isToday && !isTomorrow && !(isPast && isCompleted)) return false
      if (isFuture) return false

      // Status check
      if (!allowedStatuses.includes(s)) return false
      
      return true
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

  // Auto-fetch when filters change
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
