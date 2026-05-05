<script setup lang="ts">
/**
 * LoginView — two-step authentication screen.
 *
 * Step 1: Phone number entry (10 or 14 digits)
 * Step 2: 6-digit OTP verification
 *
 * Navigation to home is stubbed — replace API calls in useLogin.ts.
 */
import { IonPage, IonContent } from '@ionic/vue'
import { useLogin } from '@/features/auth/composables/useLogin'
import OtpInput from '@/features/auth/components/OtpInput.vue'
import AppLoadingSpinner from '@/shared/components/ui/AppLoadingSpinner.vue'

const {
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
} = useLogin()

function onPhoneInput(event: Event): void {
  const input = event.target as HTMLInputElement
  // Allow only digits
  phone.value = input.value.replace(/\D/g, '').slice(0, 14)
}
</script>

<template>
  <ion-page class="login-page">
    <ion-content :fullscreen="true" class="login-content">
      <!-- Background decoration -->
      <div class="login-bg">
        <div class="login-bg__circle login-bg__circle--1" />
        <div class="login-bg__circle login-bg__circle--2" />
        <div class="login-bg__circle login-bg__circle--3" />
      </div>

      <div class="login-container">
        <!-- ── Brand header ─────────────────────────────────────── -->
        <div class="login-brand">
          <div class="login-brand__icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect width="32" height="32" rx="10" fill="#7C3AED" />
              <path d="M8 22L13 10L16 17L19 13L24 22H8Z" fill="white" opacity="0.9" />
              <circle cx="22" cy="10" r="3" fill="white" opacity="0.7" />
            </svg>
          </div>
          <span class="login-brand__name">HomSwag</span>
        </div>

        <!-- ── Card ─────────────────────────────────────────────── -->
        <div class="login-card">

          <!-- ── STEP 1: Phone ──────────────────────────────────── -->
          <Transition name="step-slide" mode="out-in">
            <div v-if="step === 'phone'" key="phone" class="login-step">
              <div class="login-step__header">
                <h1 class="login-step__title">Welcome back</h1>
                <p class="login-step__subtitle">Enter your phone number to continue</p>
              </div>

              <div class="login-field">
                <label class="login-field__label" for="phone-input">Phone number</label>
                <div
                  class="login-field__input-wrap"
                  :class="{ 'login-field__input-wrap--error': !!phoneError }"
                >
                  <span class="login-field__prefix">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.82a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </span>
                  <input
                    id="phone-input"
                    class="login-field__input"
                    type="tel"
                    inputmode="numeric"
                    placeholder="Enter 10 or 14 digit number"
                    :value="phone"
                    :maxlength="14"
                    autocomplete="tel"
                    @input="onPhoneInput"
                    @keydown.enter="submitPhone"
                  />
                  <span v-if="phone.length > 0" class="login-field__counter">
                    {{ phone.length }}/{{ phone.length <= 10 ? 10 : 14 }}
                  </span>
                </div>
                <Transition name="fade-down">
                  <p v-if="phoneError" class="login-field__error" role="alert">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {{ phoneError }}
                  </p>
                </Transition>
              </div>

              <p class="login-hint">
                We'll send a one-time code to verify your number.
              </p>

              <button
                class="login-btn login-btn--primary"
                :class="{ 'login-btn--disabled': !isPhoneValid || isLoading }"
                :disabled="!isPhoneValid || isLoading"
                @click="submitPhone"
              >
                <AppLoadingSpinner v-if="isLoading" size="sm" />
                <span v-else>Send OTP</span>
                <svg v-if="!isLoading" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </Transition>

          <!-- ── STEP 2: OTP ────────────────────────────────────── -->
          <Transition name="step-slide" mode="out-in">
            <div v-if="step === 'otp'" key="otp" class="login-step">
              <div class="login-step__header">
                <h1 class="login-step__title">Verify your number</h1>
                <p class="login-step__subtitle">
                  Code sent to
                  <strong class="login-step__phone">{{ maskedPhone }}</strong>
                </p>
              </div>

              <div class="login-otp-wrap">
                <OtpInput
                  :model-value="otp"
                  :has-error="!!otpError"
                  :disabled="isLoading"
                  @update:model-value="onOtpChange"
                  @complete="verifyOtp"
                />
                <Transition name="fade-down">
                  <p v-if="otpError" class="login-field__error login-field__error--center" role="alert">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {{ otpError }}
                  </p>
                </Transition>
              </div>

              <button
                class="login-btn login-btn--primary"
                :class="{ 'login-btn--disabled': !isOtpValid || isLoading }"
                :disabled="!isOtpValid || isLoading"
                @click="verifyOtp"
              >
                <AppLoadingSpinner v-if="isLoading" size="sm" />
                <span v-else>Verify &amp; Continue</span>
                <svg v-if="!isLoading" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>

              <div class="login-otp-footer">
                <span class="login-otp-footer__text">Didn't receive the code?</span>
                <button class="login-otp-footer__link" @click="goBackToPhone">
                  Change number
                </button>
              </div>
            </div>
          </Transition>

        </div>
        <!-- /card -->

        <p class="login-legal">
          By continuing, you agree to our
          <a href="#" class="login-legal__link">Terms of Service</a>
          and
          <a href="#" class="login-legal__link">Privacy Policy</a>.
        </p>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
/* ── Page & content ──────────────────────────────────────────────────────── */

.login-page {
  --background: #f9fafb;
}

.login-content {
  --background: #f9fafb;
  --color: #111827;
}

/* ── Background decoration ───────────────────────────────────────────────── */

.login-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.login-bg__circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.08;
}

.login-bg__circle--1 {
  width: 420px;
  height: 420px;
  background: radial-gradient(circle, #7c3aed, transparent 70%);
  top: -140px;
  right: -100px;
}

.login-bg__circle--2 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, #1e3a8a, transparent 70%);
  bottom: 60px;
  left: -80px;
}

.login-bg__circle--3 {
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, #9d5cf6, transparent 70%);
  top: 40%;
  left: 50%;
  transform: translateX(-50%);
}

/* ── Layout container ────────────────────────────────────────────────────── */

.login-container {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100%;
  padding: 56px 20px 32px;
  box-sizing: border-box;
}

/* ── Brand ───────────────────────────────────────────────────────────────── */

.login-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 40px;
}

.login-brand__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  filter: drop-shadow(0 4px 12px rgba(124, 58, 237, 0.35));
}

.login-brand__name {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, #7c3aed 0%, #1e3a8a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ── Card ────────────────────────────────────────────────────────────────── */

.login-card {
  width: 100%;
  max-width: 400px;
  background: #ffffff;
  border-radius: 24px;
  padding: 32px 28px;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.06),
    0 8px 32px rgba(124, 58, 237, 0.1),
    0 24px 64px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

/* ── Step ────────────────────────────────────────────────────────────────── */

.login-step {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.login-step__header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.login-step__title {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: #111827;
  letter-spacing: -0.5px;
  line-height: 1.2;
}

.login-step__subtitle {
  margin: 0;
  font-size: 15px;
  color: #6b7280;
  line-height: 1.5;
}

.login-step__phone {
  color: #7c3aed;
  font-weight: 600;
}

/* ── Field ───────────────────────────────────────────────────────────────── */

.login-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.login-field__label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.login-field__input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 14px;
  padding: 0 14px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.login-field__input-wrap:focus-within {
  border-color: #7c3aed;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.12);
  background: #ffffff;
}

.login-field__input-wrap--error {
  border-color: #dc2626 !important;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1) !important;
}

.login-field__prefix {
  display: flex;
  align-items: center;
  color: #9ca3af;
  flex-shrink: 0;
}

.login-field__input {
  flex: 1;
  height: 52px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 17px;
  font-weight: 500;
  color: #111827;
  letter-spacing: 0.5px;
  -webkit-appearance: none;
  appearance: none;
}

.login-field__input::placeholder {
  color: #d1d5db;
  font-weight: 400;
  font-size: 15px;
  letter-spacing: 0;
}

.login-field__counter {
  font-size: 12px;
  font-weight: 500;
  color: #9ca3af;
  flex-shrink: 0;
}

.login-field__error {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 0;
  font-size: 13px;
  color: #dc2626;
  font-weight: 500;
}

.login-field__error--center {
  justify-content: center;
}

/* ── Hint ────────────────────────────────────────────────────────────────── */

.login-hint {
  margin: -8px 0 0;
  font-size: 13px;
  color: #9ca3af;
  line-height: 1.5;
}

/* ── OTP wrapper ─────────────────────────────────────────────────────────── */

.login-otp-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

/* ── Primary button ──────────────────────────────────────────────────────── */

.login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 54px;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.14s ease, box-shadow 0.14s ease, opacity 0.14s ease;
  -webkit-tap-highlight-color: transparent;
}

.login-btn--primary {
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  color: #ffffff;
  box-shadow: 0 4px 16px rgba(124, 58, 237, 0.4);
}

.login-btn--primary:active:not(:disabled) {
  transform: scale(0.97);
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
}

.login-btn--disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

/* ── OTP footer ──────────────────────────────────────────────────────────── */

.login-otp-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
}

.login-otp-footer__text {
  font-size: 14px;
  color: #6b7280;
}

.login-otp-footer__link {
  background: none;
  border: none;
  padding: 0;
  font-size: 14px;
  font-weight: 600;
  color: #7c3aed;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  -webkit-tap-highlight-color: transparent;
}

/* ── Legal ───────────────────────────────────────────────────────────────── */

.login-legal {
  margin-top: 24px;
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
  line-height: 1.6;
  max-width: 300px;
}

.login-legal__link {
  color: #7c3aed;
  text-decoration: none;
  font-weight: 500;
}

/* ── Transitions ─────────────────────────────────────────────────────────── */

.step-slide-enter-active,
.step-slide-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.step-slide-enter-from {
  opacity: 0;
  transform: translateX(24px);
}

.step-slide-leave-to {
  opacity: 0;
  transform: translateX(-24px);
}

.fade-down-enter-active,
.fade-down-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.fade-down-enter-from,
.fade-down-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
