/**
 * useOtRequests
 *
 * Manages OT (overtime) request state and API calls.
 * Maps to server's OvertimeEntry model (date + reason, no hours field).
 */

import { ref } from 'vue'
import { getOtRequests, createOtRequest, cancelOtRequest } from '@/shared/api'
import type { OtRequest, OtRequestCreateBody } from '@/shared/models'

export function useOtRequests() {
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

  async function submitRequest(body: OtRequestCreateBody): Promise<OtRequest | null> {
    isSubmitting.value = true
    error.value = null
    try {
      const result = await createOtRequest(body)
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
