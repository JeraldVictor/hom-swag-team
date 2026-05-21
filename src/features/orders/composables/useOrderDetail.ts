import { computed, readonly, ref } from 'vue'
import {
  generateServiceOtp as generateServiceOtpApi,
  getOrder as getOrderApi,
  getUpgradableProducts as getUpgradableProductsApi,
  updateOrder as updateOrderApi,
  updateOrderStatus as updateOrderStatusApi,
  upgradeOrderProduct as upgradeOrderProductApi,
  uploadArrivalSelfie as uploadArrivalSelfieApi,
  uploadCompletionProof as uploadCompletionProofApi,
  verifyServiceOtp as verifyServiceOtpApi,
} from '@/shared/api'
import { useCamera, useDirections } from '@/shared/composables'
import type { Order, OrderProduct, UpgradeProductBody, UpdateOrderPayload } from '@/shared/models'

/** Helper to convert base64 data URL to Blob */
function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(';base64,')
  const contentType = parts[0].split(':')[1]
  const raw = window.atob(parts[1])
  const rawLength = raw.length
  const uInt8Array = new Uint8Array(rawLength)
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i)
  }
  return new Blob([uInt8Array], { type: contentType })
}

/** Status progression for beautician */
const NEXT_STATUS: Partial<
  Record<string, 'ongoing' | 'reached_customer_place' | 'started' | 'completed'>
> = {
  Confirmed: 'ongoing',
  confirmed: 'ongoing',
  ongoing: 'reached_customer_place',
  Ongoing: 'reached_customer_place',
  reached_customer_place: 'started',
  started: 'completed',
  Started: 'completed',
}

const NEXT_LABEL: Partial<Record<string, string>> = {
  Confirmed: 'Start to Customer',
  confirmed: 'Start to Customer',
  ongoing: 'Reached Customer Place',
  Ongoing: 'Reached Customer Place',
  reached_customer_place: 'Take Selfie',
  started: 'Complete Service',
  Started: 'Complete Service',
}

export function useOrderDetail() {
  const order = ref<Order | null>(null)
  const isLoading = ref(false)
  const isUpdating = ref(false)
  const isGeneratingOtp = ref(false)
  const isVerifyingOtp = ref(false)
  const error = ref<string | null>(null)

  const { openDirections } = useDirections()
  const { takePhoto } = useCamera()

  const nextActionLabel = computed(() => {
    if (!order.value) return null
    const s = order.value.status.toLowerCase()
    if (s === 'reached_customer_place' && order.value.arrival_selfie) {
      return 'Enter OTP to Start'
    }
    return NEXT_LABEL[order.value.status] ?? null
  })

  const isCompleted = computed(() => order.value?.status?.toLowerCase() === 'completed')

  const canUpgrade = computed(() => {
    const s = order.value?.status?.toLowerCase()
    return s === 'started'
  })

  async function fetchOrder(id: string | number): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      order.value = await getOrderApi(id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load order'
    } finally {
      isLoading.value = false
    }
  }

  async function advanceStatus(reason?: string, otp?: string): Promise<void> {
    if (!order.value) return
    const next = NEXT_STATUS[order.value.status]
    if (!next) return

    isUpdating.value = true
    error.value = null
    try {
      const id = order.value._id || order.value.id
      order.value = await updateOrderStatusApi(id, {
        status: next,
        status_reason: reason,
        otp,
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update status'
    } finally {
      isUpdating.value = false
    }
  }

  async function uploadSelfie(): Promise<boolean> {
    if (!order.value) return false
    isUpdating.value = true
    error.value = null
    try {
      const dataUrl = await takePhoto()
      if (!dataUrl) return false

      const blob = dataUrlToBlob(dataUrl)
      const formData = new FormData()
      formData.append('image', blob, `selfie_${order.value._id || order.value.id}.jpg`)

      const id = order.value._id || order.value.id
      order.value = await uploadArrivalSelfieApi(id, formData)
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to upload selfie'
      return false
    } finally {
      isUpdating.value = false
    }
  }

  async function captureAndUploadPaymentProof(): Promise<boolean> {
    if (!order.value) return false
    isUpdating.value = true
    error.value = null
    try {
      const dataUrl = await takePhoto()
      if (!dataUrl) return false

      const blob = dataUrlToBlob(dataUrl)
      const id = order.value._id || order.value.id
      const formData = new FormData()
      formData.append('image', blob, `payment_proof_${id}_${Date.now()}.jpg`)

      order.value = await uploadCompletionProofApi(id, formData)
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to capture payment proof'
      return false
    } finally {
      isUpdating.value = false
    }
  }

  async function uploadCompletionProofFiles(files: FileList | File[]): Promise<boolean> {
    if (!order.value) return false
    const id = order.value._id || order.value.id
    const formData = new FormData()

    const fileArray = Array.from(files)
    if (fileArray.length === 0) {
      error.value = 'Please select at least one photo.'
      return false
    }

    fileArray.forEach((file, index) => {
      formData.append('image', file, file.name || `completion_${index + 1}.jpg`)
    })

    isUpdating.value = true
    error.value = null
    try {
      order.value = await uploadCompletionProofApi(id, formData)
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to upload completion proof'
      return false
    } finally {
      isUpdating.value = false
    }
  }

  async function cancelAfterArrival(reason: string, otp?: string): Promise<void> {
    if (!order.value) return
    isUpdating.value = true
    error.value = null
    try {
      const id = order.value._id || order.value.id
      order.value = await updateOrderStatusApi(id, {
        status: 'cancel_requested',
        status_reason: reason,
        otp,
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to submit cancellation request'
    } finally {
      isUpdating.value = false
    }
  }

  async function generateOtp(): Promise<string | null> {
    if (!order.value) return null
    isGeneratingOtp.value = true
    error.value = null
    try {
      const id = order.value._id || order.value.id
      const updated = await generateServiceOtpApi(id)
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
      const id = order.value._id || order.value.id
      order.value = await verifyServiceOtpApi(id, { otp })
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Invalid OTP'
      return false
    } finally {
      isVerifyingOtp.value = false
    }
  }

  async function upgradeProduct(body: UpgradeProductBody): Promise<void> {
    if (!order.value) return
    isUpdating.value = true
    error.value = null
    try {
      const id = order.value._id || order.value.id
      order.value = await upgradeOrderProductApi(id, body)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to upgrade product'
    } finally {
      isUpdating.value = false
    }
  }

  async function updateOrderDetails(updates: UpdateOrderPayload): Promise<void> {
    if (!order.value) return
    isUpdating.value = true
    error.value = null
    try {
      const id = order.value._id || order.value.id
      order.value = await updateOrderApi(id, updates)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update order'
    } finally {
      isUpdating.value = false
    }
  }

  function navigateToCustomer() {
    if (!order.value?.address) return
    const addr = order.value.delivery_address || order.value.address
    if (addr?.latitude && addr?.longitude) {
      openDirections(Number(addr.latitude), Number(addr.longitude), order.value.customer?.full_name)
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
    canUpgrade,
    fetchOrder,
    advanceStatus,
    uploadSelfie,
    uploadCompletionProof: uploadCompletionProofFiles,
    cancelAfterArrival,
    generateOtp,
    verifyOtp,
    upgradeProduct,
    updateOrderDetails,
    getUpgradableProducts: getUpgradableProductsApi,
    navigateToCustomer,
    captureAndUploadPaymentProof,
  }
}
