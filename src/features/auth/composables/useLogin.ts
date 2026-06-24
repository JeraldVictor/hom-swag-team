/**
 * useLogin composable
 *
 * Manages the two-step OTP login flow:
 *   Step 1 — phone number entry (10 digits) → POST /auth/otp/request
 *   Step 2 — 6-digit OTP verification → POST /auth/otp/verify
 *
 * On successful verification:
 *   - Persists tokens and user profile via the auth store
 *   - If `get_profile` is true, fetches the full profile from GET /profile
 *   - Navigates to /tabs/home
 */

import type { ComputedRef, Ref } from 'vue'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { requestOtp, verifyOtp } from '@/shared/api/auth.service'
import { getProfile } from '@/shared/api/profile.service'
import { locationTracker } from '@/shared/composables/useLocationTracker'
import { useToast } from '@/shared/composables/useToast'
import { useAuthStore } from '@/shared/stores/auth'

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
  resendCooldown: Ref<number>
  isResendDisabled: ComputedRef<boolean>
  resendLimitReached: ComputedRef<boolean>
  // Actions
  submitPhone: () => Promise<void>
  resendOtp: () => Promise<void>
  verifyOtpAndLogin: () => Promise<void>
  goBackToPhone: () => void
  onOtpChange: (value: string) => void
}
const MAX_RESEND_ATTEMPTS = 3
const RESEND_COOLDOWN_SECONDS = 15

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
  const resendAttempts = ref<number>(0)
  const resendCooldown = ref<number>(0)

  // ---- Computed -------------------------------------------------------------

  /** Accept exactly 10 digit strings (digits only). */
  const isPhoneValid = computed<boolean>(() => {
    const digits = phone.value.replace(/\D/g, '')
    return digits.length === 10
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

  const resendLimitReached = computed<boolean>(() => resendAttempts.value >= MAX_RESEND_ATTEMPTS)
  const isResendDisabled = computed<boolean>(() => {
    return isLoading.value || resendCooldown.value > 0 || resendLimitReached.value
  })

  const startResendCooldown = (): void => {
    resendCooldown.value = RESEND_COOLDOWN_SECONDS
  }

  watch(
    () => resendCooldown.value,
    (value, _previousValue, onCleanup) => {
      if (value <= 0) return

      const timer = window.setInterval(() => {
        resendCooldown.value = Math.max(resendCooldown.value - 1, 0)
      }, 1000)

      onCleanup(() => {
        window.clearInterval(timer)
      })
    }
  )

  // ---- Actions --------------------------------------------------------------

  /**
   * Step 1 — submit phone number.
   * Calls POST /auth/otp/request and advances to the OTP step on success.
   */
  async function submitPhone(): Promise<void> {
    await requestOtpCode(false)
  }

  async function resendOtp(): Promise<void> {
    await requestOtpCode(true)
  }

  async function requestOtpCode(isResend: boolean): Promise<void> {
    phoneError.value = ''

    if (!isPhoneValid.value) {
      phoneError.value = 'Enter a valid 10 digit phone number.'
      return
    }

    if (isResend && resendLimitReached.value) {
      phoneError.value = 'Too many OTP resend attempts. Please contact support.'
      showError(phoneError.value)
      return
    }

    isLoading.value = true
    try {
      await requestOtp({ phone: phone.value })
      if (isResend) {
        resendAttempts.value = Math.min(resendAttempts.value + 1, MAX_RESEND_ATTEMPTS)
      } else {
        resendAttempts.value = 0
      }
      step.value = 'otp'
      startResendCooldown()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send OTP. Please try again.'
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

      const redirectPath =
        (router.currentRoute.value.query.redirect as string | undefined) || '/home'
      await router.replace(redirectPath)

      // Start location tracking now that the user is authenticated
      void locationTracker.start()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid OTP. Please try again.'
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
    resendAttempts.value = 0
    resendCooldown.value = 0
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
    resendCooldown,
    isResendDisabled,
    resendLimitReached,
    submitPhone,
    resendOtp,
    verifyOtpAndLogin,
    goBackToPhone,
    onOtpChange,
  }
}
