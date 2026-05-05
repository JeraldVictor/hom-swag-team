/**
 * useLogin composable
 *
 * Manages the two-step login flow:
 *   Step 1 — phone number entry (10 or 14 digits)
 *   Step 2 — 6-digit OTP verification
 *
 * For now, navigation to home is triggered on button click without API calls.
 * Replace the `submitPhone` and `verifyOtp` stubs with real API calls later.
 */

import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LoginStep = 'phone' | 'otp'

export interface UseLoginReturn {
  // State
  step: ReturnType<typeof ref<LoginStep>>
  phone: ReturnType<typeof ref<string>>
  otp: ReturnType<typeof ref<string>>
  isLoading: ReturnType<typeof ref<boolean>>
  phoneError: ReturnType<typeof ref<string>>
  otpError: ReturnType<typeof ref<string>>
  // Computed
  isPhoneValid: ReturnType<typeof computed<boolean>>
  isOtpValid: ReturnType<typeof computed<boolean>>
  maskedPhone: ReturnType<typeof computed<string>>
  // Actions
  submitPhone: () => Promise<void>
  verifyOtp: () => Promise<void>
  goBackToPhone: () => void
  onOtpChange: (value: string) => void
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useLogin(): UseLoginReturn {
  const router = useRouter()

  // ---- State ----------------------------------------------------------------

  const step = ref<LoginStep>('phone')
  const phone = ref<string>('')
  const otp = ref<string>('')
  const isLoading = ref<boolean>(false)
  const phoneError = ref<string>('')
  const otpError = ref<string>('')

  // ---- Computed -------------------------------------------------------------

  /** Accept exactly 10 or 14 digit strings (digits only). */
  const isPhoneValid = computed<boolean>(() => {
    const digits = phone.value.replace(/\D/g, '')
    return digits.length === 10 || digits.length === 14
  })

  /** OTP must be exactly 6 digits. */
  const isOtpValid = computed<boolean>(() => {
    return /^\d{6}$/.test(otp.value)
  })

  /** Show last 4 digits of phone, mask the rest. */
  const maskedPhone = computed<string>(() => {
    const digits = phone.value.replace(/\D/g, '')
    if (digits.length <= 4) return digits
    const visible = digits.slice(-4)
    const masked = '*'.repeat(digits.length - 4)
    return `${masked}${visible}`
  })

  // ---- Actions --------------------------------------------------------------

  /**
   * Step 1 — submit phone number.
   * Validates locally, then (stub) moves to OTP step.
   * Replace the stub block with a real API call: POST /auth/send-otp
   */
  async function submitPhone(): Promise<void> {
    phoneError.value = ''

    if (!isPhoneValid.value) {
      phoneError.value = 'Enter a valid 10 or 14 digit phone number.'
      return
    }

    isLoading.value = true
    try {
      // --- STUB: replace with real API call ---
      await new Promise<void>((resolve) => setTimeout(resolve, 600))
      // ----------------------------------------
      step.value = 'otp'
    } catch {
      phoneError.value = 'Failed to send OTP. Please try again.'
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Step 2 — verify OTP.
   * Validates locally, then (stub) navigates to home.
   * Replace the stub block with a real API call: POST /auth/verify-otp
   */
  async function verifyOtp(): Promise<void> {
    otpError.value = ''

    if (!isOtpValid.value) {
      otpError.value = 'Enter the 6-digit code sent to your phone.'
      return
    }

    isLoading.value = true
    try {
      // --- STUB: replace with real API call ---
      await new Promise<void>((resolve) => setTimeout(resolve, 600))
      // ----------------------------------------
      await router.replace('/tabs/home')
    } catch {
      otpError.value = 'Invalid OTP. Please try again.'
    } finally {
      isLoading.value = false
    }
  }

  /** Go back to phone entry and reset OTP state. */
  function goBackToPhone(): void {
    step.value = 'phone'
    otp.value = ''
    otpError.value = ''
  }

  /** Called by OtpInput when the composed value changes. */
  function onOtpChange(value: string): void {
    otp.value = value
    if (otpError.value) otpError.value = ''
  }

  return {
    step,
    phone,
    otp,
    isLoading,
    phoneError,
    otpError,
    isPhoneValid,
    isOtpValid,
    maskedPhone,
    submitPhone,
    verifyOtp,
    goBackToPhone,
    onOtpChange,
  }
}
