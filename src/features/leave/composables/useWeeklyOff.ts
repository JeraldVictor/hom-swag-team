/**
 * useWeeklyOff
 *
 * Manages weekly off request state and API calls.
 */

import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore, useUserTypeStore } from '@/shared/stores'
import { getWeeklyOffRequests, createWeeklyOffRequest, cancelWeeklyOffRequest } from '@/shared/api'
import type { WeeklyOffRequest, WeeklyOffRequestBody } from '@/shared/models'

export function useWeeklyOff() {
  const authStore = useAuthStore()
  const userTypeStore = useUserTypeStore()
  const { user } = storeToRefs(authStore)
  const { userType } = storeToRefs(userTypeStore)

  const requests = ref<WeeklyOffRequest[]>([])
  const isLoading = ref(false)
  const isSubmitting = ref(false)
  const isCancelling = ref<string | number | null>(null)
  const error = ref<string | null>(null)

  async function fetchRequests(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      requests.value = await getWeeklyOffRequests()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load weekly off requests'
    } finally {
      isLoading.value = false
    }
  }

  async function submitRequest(
    body: Omit<WeeklyOffRequestBody, 'requester_id' | 'requester_type'>,
  ): Promise<WeeklyOffRequest | null> {
    if (!user.value || !userType.value) return null
    isSubmitting.value = true
    error.value = null
    try {
      const result = await createWeeklyOffRequest({
        requester_id: String(user.value.id),
        requester_type: userType.value as 'beautician' | 'rider',
        ...body,
      })
      requests.value.unshift(result)
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to submit weekly off request'
      return null
    } finally {
      isSubmitting.value = false
    }
  }

  async function cancelRequest(id: string | number): Promise<boolean> {
    isCancelling.value = id
    error.value = null
    try {
      await cancelWeeklyOffRequest(id)
      requests.value = requests.value.filter((r) => (r.id ?? r._id) !== id)
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to cancel weekly off request'
      return false
    } finally {
      isCancelling.value = null
    }
  }

  return {
    requests,
    isLoading,
    isSubmitting,
    isCancelling,
    error,
    fetchRequests,
    submitRequest,
    cancelRequest,
  }
}
