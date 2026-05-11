<script setup lang="ts">
/**
 * OtpInput — 6-box OTP entry component.
 *
 * Renders 6 individual single-character inputs.
 * Handles auto-advance, backspace navigation, and paste.
 * Emits `update:modelValue` with the composed 6-char string.
 */
import { nextTick, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    disabled?: boolean
    hasError?: boolean
  }>(),
  {
    modelValue: '',
    disabled: false,
    hasError: false,
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'complete', value: string): void
}>()

// One ref per box
const digits = ref<string[]>(Array(6).fill(''))
const inputRefs = ref<HTMLInputElement[]>([])

// Sync external modelValue → internal digits
watch(
  () => props.modelValue,
  val => {
    const chars = (val ?? '').split('').slice(0, 6)
    digits.value = [...chars, ...Array(6).fill('')].slice(0, 6)
  },
  { immediate: true }
)

function emitValue(): void {
  const value = digits.value.join('')
  emit('update:modelValue', value)
  if (value.length === 6 && /^\d{6}$/.test(value)) {
    emit('complete', value)
  }
}

function focusBox(index: number): void {
  nextTick(() => {
    inputRefs.value[index]?.focus()
  })
}

function onInput(index: number, event: Event): void {
  const input = event.target as HTMLInputElement
  const raw = input.value.replace(/\D/g, '')

  if (!raw) {
    digits.value[index] = ''
    emitValue()
    return
  }

  // Handle paste of multiple digits into one box
  if (raw.length > 1) {
    const chars = raw.split('').slice(0, 6 - index)
    chars.forEach((ch, i) => {
      if (index + i < 6) digits.value[index + i] = ch
    })
    emitValue()
    const nextFocus = Math.min(index + chars.length, 5)
    focusBox(nextFocus)
    return
  }

  digits.value[index] = raw[0]
  emitValue()

  if (index < 5) focusBox(index + 1)
}

function onKeydown(index: number, event: KeyboardEvent): void {
  if (event.key === 'Backspace') {
    if (digits.value[index]) {
      digits.value[index] = ''
      emitValue()
    } else if (index > 0) {
      digits.value[index - 1] = ''
      emitValue()
      focusBox(index - 1)
    }
    event.preventDefault()
  } else if (event.key === 'ArrowLeft' && index > 0) {
    focusBox(index - 1)
  } else if (event.key === 'ArrowRight' && index < 5) {
    focusBox(index + 1)
  }
}

function onPaste(event: ClipboardEvent): void {
  event.preventDefault()
  const text = event.clipboardData?.getData('text') ?? ''
  const clean = text.replace(/\D/g, '').slice(0, 6)
  clean.split('').forEach((ch, i) => {
    digits.value[i] = ch
  })
  emitValue()
  const nextFocus = Math.min(clean.length, 5)
  focusBox(nextFocus)
}

function setRef(el: unknown, index: number): void {
  if (el) inputRefs.value[index] = el as HTMLInputElement
}
</script>

<template>
  <div class="otp-input" :class="{ 'otp-input--error': hasError }">
    <input
      v-for="(digit, i) in digits"
      :key="i"
      :ref="(el) => setRef(el, i)"
      class="otp-input__box"
      :class="{
        'otp-input__box--filled': !!digit,
        'otp-input__box--error': hasError,
      }"
      type="tel"
      inputmode="numeric"
      maxlength="6"
      autocomplete="one-time-code"
      :value="digit"
      :disabled="disabled"
      @input="onInput(i, $event)"
      @keydown="onKeydown(i, $event)"
      @paste="onPaste"
      @focus="($event.target as HTMLInputElement).select()"
    />
  </div>
</template>

<style scoped>
.otp-input {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.otp-input__box {
  width: 48px;
  height: 56px;
  border: 2px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-lg, 12px);
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #111827);
  font-size: var(--font-size-2xl, 24px);
  font-weight: var(--font-weight-bold, 700);
  text-align: center;
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.12s ease;
  -webkit-appearance: none;
  appearance: none;
  caret-color: transparent;
}

.otp-input__box:focus {
  border-color: var(--color-brand, #7c3aed);
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
  transform: scale(1.04);
}

.otp-input__box--filled {
  border-color: var(--color-brand-mid, #9d5cf6);
  background: var(--color-brand-pale, #ede9fe);
  color: var(--color-brand, #7c3aed);
}

.otp-input__box--error {
  border-color: var(--color-error, #dc2626) !important;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12) !important;
}

/* Hide number input spinners */
.otp-input__box::-webkit-outer-spin-button,
.otp-input__box::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
