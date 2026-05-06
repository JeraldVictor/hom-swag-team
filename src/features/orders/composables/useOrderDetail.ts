/**
 * useOrderDetail
 *
 * Composable for fetching a single order and managing its status.
 */

import { ref, readonly, computed } from 'vue'
import { getOrder, updateOrderStatus, generateServiceOtp, verifyServiceOtp } from '@/shared/api'
import type { Order, OrderStatus } from '@/shared/models'

/** Status progression for beautician */
const NEXT_STATUS: Partial<Record<string, 'started' | 'ongoing' | 'completed'>> = {
  Confirmed: 'started',
  started: 'ongoing',
  Started: 'ongoing',
  ongoing: 'completed',
  Ongoing: 'completed',
}

const NEXT_LABEL: Partial<Record<string, string>> = {
  Confirmed: 'Start Service',
  started: 'Mark Ongoing',
  Started: 'Mark Ongoing',
  ongoing: 'Complete Service',
  Ongoing: 'Complete Service',
}

export function useOrderDetail() {
  const order = ref<Order | null>(null)
  const isLoading = ref(false)
  const isUpdating = ref(false)
  const isGeneratingOtp = ref(false)
  const isVerifyingOtp = ref(false)
  const error = ref<string | null>(null)

  const nextActionLabel = computed(() =>
    order.value ? (NEXT_LABEL[order.value.status] ?? null) : null
  )

  const isCompleted = computed(() =>
    order.value?.status === 'Completed' || order.value?.status === 'completed'
  )

  async function fetchOrder(id: string | number): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      order.value = await getOrder(id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load order'
    } finally {
      isLoading.value = false
    }
  }

  async function advanceStatus(reason?: string): Promise<void> {
    if (!order.value) return
    const next = NEXT_STATUS[order.value.status]
    if (!next) return

    isUpdating.value = true
    error.value = null
    try {
      order.value = await updateOrderStatus(order.value.id, { status: next, status_reason: reason })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update status'
    } finally {
      isUpdating.value = false
    }
  }

  async function cancelAfterArrival(reason: string): Promise<void> {
    if (!order.value) return
    isUpdating.value = true
    error.value = null
    try {
      order.value = await updateOrderStatus(order.value.id, {
        status: 'arrived_and_cancelled',
        status_reason: reason,
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to cancel order'
    } finally {
      isUpdating.value = false
    }
  }

  async function generateOtp(): Promise<string | null> {
    if (!order.value) return null
    isGeneratingOtp.value = true
    error.value = null
    try {
      const updated = await generateServiceOtp(order.value.id)
      order.value = updated
      return updated.service_otp ?? null
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to generate OTP'
      return null
    } finally {
      isGeneratingOtp.value = false
    }
  }

  async function verifyOtp(otp: string): Promise<boolean> {
    if (!order.value) return false
    isVerifyingOtp.value = true
    error.value = null
    try {
      order.value = await verifyServiceOtp(order.value.id, { otp })
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Invalid OTP'
      return false
    } finally {
      isVerifyingOtp.value = false
    }
  }

  return {
    order: readonly(order),
    isLoading: readonly(isLoading),
    isUpdating: readonly(isUpdating),
    isGeneratingOtp: readonly(isGeneratingOtp),
    isVerifyingOtp: readonly(isVerifyingOtp),
    error: readonly(error),
    nextActionLabel,
    isCompleted,
    fetchOrder,
    advanceStatus,
    cancelAfterArrival,
    generateOtp,
    verifyOtp,
  }
}
