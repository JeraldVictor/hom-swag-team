/**
 * useOtRequests
 *
 * Manages OT (overtime) request state and API calls.
 */

import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore, useUserTypeStore } from '@/shared/stores'
import { getOtRequests, createOtRequest, cancelOtRequest } from '@/shared/api'
import type { OtRequest, OtRequestBody } from '@/shared/models'

export function useOtRequests() {
  const authStore = useAuthStore()
  const userTypeStore = useUserTypeStore()
  const { user } = storeToRefs(authStore)
  const { userType } = storeToRefs(userTypeStore)

  const requests = ref<OtRequest[]>([])
  const isLoading = ref(false)
  const isSubmitting = ref(false)
  const isCancelling = ref<string | number | null>(null)
  const error = ref<string | null>(null)

  async function fetchRequests(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      requests.value = await getOtRequests()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load OT requests'
    } finally {
      isLoading.value = false
    }
  }

  async function submitRequest(
    body: Omit<OtRequestBody, 'requester_id' | 'requester_type'>,
  ): Promise<OtRequest | null> {
    if (!user.value || !userType.value) return null
    isSubmitting.value = true
    error.value = null
    try {
      const result = await createOtRequest({
        requester_id: String(user.value.id),
        requester_type: userType.value as 'beautician' | 'rider',
        ...body,
      })
      requests.value.unshift(result)
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to submit OT request'
      return null
    } finally {
      isSubmitting.value = false
    }
  }

  async function cancelRequest(id: string | number): Promise<boolean> {
    isCancelling.value = id
    error.value = null
    try {
      await cancelOtRequest(id)
      requests.value = requests.value.filter((r) => (r.id ?? r._id) !== id)
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to cancel OT request'
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
