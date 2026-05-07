/**
 * useLogin composable
 *
 * Manages the two-step OTP login flow:
 *   Step 1 — phone number entry (10 or 14 digits) → POST /auth/otp/request
 *   Step 2 — 6-digit OTP verification → POST /auth/otp/verify
 *
 * On successful verification:
 *   - Persists tokens and user profile via the auth store
 *   - If `get_profile` is true, fetches the full profile from GET /profile
 *   - Navigates to /tabs/home
 */

import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/shared/stores/auth'
import { requestOtp, verifyOtp } from '@/shared/api/auth.service'
import { getProfile } from '@/shared/api/profile.service'
import { useToast } from '@/shared/composables/useToast'
import { locationTracker } from '@/shared/composables/useLocationTracker'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LoginStep = 'phone' | 'otp'

export interface UseLoginReturn {
  // State
  step: Ref<LoginStep>
  phone: Ref<string>
  otp: Ref<string>
  isLoading: Ref<boolean>
  phoneError: Ref<string>
  otpError: Ref<string>
  // Computed
  isPhoneValid: ComputedRef<boolean>
  isOtpValid: ComputedRef<boolean>
  maskedPhone: ComputedRef<string>
  // Actions
  submitPhone: () => Promise<void>
  verifyOtpAndLogin: () => Promise<void>
  goBackToPhone: () => void
  onOtpChange: (value: string) => void
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useLogin(): UseLoginReturn {
  const router = useRouter()
  const authStore = useAuthStore()
  const { showError } = useToast()

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
   * Calls POST /auth/otp/request and advances to the OTP step on success.
   */
  async function submitPhone(): Promise<void> {
    phoneError.value = ''

    if (!isPhoneValid.value) {
      phoneError.value = 'Enter a valid 10 or 14 digit phone number.'
      return
    }

    isLoading.value = true
    try {
      await requestOtp({ phone: phone.value })
      step.value = 'otp'
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to send OTP. Please try again.'
      phoneError.value = message
      showError(message)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Step 2 — verify OTP and complete login.
   * Calls POST /auth/otp/verify, persists auth state, optionally fetches
   * the full profile, then navigates to the home tab.
   */
  async function verifyOtpAndLogin(): Promise<void> {
    otpError.value = ''

    if (!isOtpValid.value) {
      otpError.value = 'Enter the 6-digit code sent to your phone.'
      return
    }

    isLoading.value = true
    try {
      const authResponse = await verifyOtp({ phone: phone.value, otp: otp.value })

      // Persist tokens + basic user info to store and storage
      await authStore.login(authResponse)

      // If the server signals a profile fetch is needed, get the full profile
      if (authResponse.get_profile) {
        try {
          const fullProfile = await getProfile()
          await authStore.setUserProfile(fullProfile)
        } catch {
          // Non-fatal — basic profile from auth response is already stored
        }
      }

      await router.replace('/home')

      // Start location tracking now that the user is authenticated
      void locationTracker.start()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Invalid OTP. Please try again.'
      otpError.value = message
      showError(message)
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
    verifyOtpAndLogin,
    goBackToPhone,
    onOtpChange,
  }
}
