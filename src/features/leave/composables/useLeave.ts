/**
 * useLeave
 *
 * Composable for leave request management: list, create, cancel, balance.
 */

import { ref, readonly } from 'vue'
import type { Ref } from 'vue'
import {
  getLeaveRequests,
  createLeaveRequest,
  cancelLeaveRequest,
  getLeaveBalance,
} from '@/shared/api'
import type { LeaveRequest, LeaveRequestBody, LeaveBalance } from '@/shared/models'

export function useLeave() {
  const requests = ref<LeaveRequest[]>([])
  const balance = ref<LeaveBalance | null>(null)
  const isLoading = ref(false)
  const isSubmitting = ref(false)
  const isCancelling = ref<string | number | null>(null)
  const error = ref<string | null>(null)

  async function fetchRequests(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      requests.value = await getLeaveRequests({ limit: 50 })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load leave requests'
    } finally {
      isLoading.value = false
    }
  }

  async function fetchBalance(): Promise<void> {
    try {
      balance.value = await getLeaveBalance()
    } catch {
      // non-critical
    }
  }

  async function submitRequest(body: LeaveRequestBody): Promise<LeaveRequest | null> {
    isSubmitting.value = true
    error.value = null
    try {
      const created = await createLeaveRequest(body)
      requests.value.unshift(created)
      return created
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to submit leave request'
      return null
    } finally {
      isSubmitting.value = false
    }
  }

  async function cancelRequest(id: string | number): Promise<boolean> {
    isCancelling.value = id
    error.value = null
    try {
      await cancelLeaveRequest(id)
      const idx = requests.value.findIndex((r) => r.id === id || r._id === id)
      if (idx !== -1) requests.value.splice(idx, 1)
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to cancel leave request'
      return false
    } finally {
      isCancelling.value = null
    }
  }

  return {
    requests: readonly(requests) as Readonly<Ref<LeaveRequest[]>>,
    balance: readonly(balance) as Readonly<Ref<LeaveBalance | null>>,
    isLoading: readonly(isLoading),
    isSubmitting: readonly(isSubmitting),
    isCancelling: readonly(isCancelling),
    error: readonly(error),
    fetchRequests,
    fetchBalance,
    submitRequest,
    cancelRequest,
  }
}
