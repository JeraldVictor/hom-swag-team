/**
 * useOrders
 *
 * Composable for fetching and managing the beautician's order list.
 */

import { ref, readonly } from 'vue'
import { getOrders } from '@/shared/api'
import type { Order } from '@/shared/models'

export function useOrders() {
  const orders = ref<Order[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function fetchOrders(page = 1, limit = 20): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const res = await getOrders(page, limit)
      // Handle both paginated envelope and plain array
      orders.value = Array.isArray(res) ? res : (res.data ?? [])
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load orders'
      orders.value = []
    } finally {
      isLoading.value = false
    }
  }

  async function refresh(): Promise<void> {
    await fetchOrders(1)
  }

  return {
    orders: readonly(orders),
    isLoading: readonly(isLoading),
    error: readonly(error),
    fetchOrders,
    refresh,
  }
}
