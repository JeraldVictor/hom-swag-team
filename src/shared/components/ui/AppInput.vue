<script setup lang="ts">
import { IonInput, IonLabel, IonNote } from '@ionic/vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    label?: string
    hint?: string
    error?: string
    type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
    maxlength?: number
    disabled?: boolean
  }>(),
  {
    modelValue: null,
    label: undefined,
    hint: undefined,
    error: undefined,
    type: 'text',
    maxlength: undefined,
    disabled: false,
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number | null): void
}>()

function onIonInput(event: CustomEvent) {
  emit('update:modelValue', event.detail.value ?? null)
}
</script>

<template>
  <div class="app-input">
    <ion-label v-if="label" class="app-input__label" :class="{ 'app-input__label--error': !!error }">
      {{ label }}
    </ion-label>

    <ion-input
      :value="modelValue"
      :type="type"
      :maxlength="maxlength"
      :disabled="disabled"
      :class="{ 'app-input__field--error': !!error }"
      @ionInput="onIonInput"
    />

    <ion-note v-if="error" class="app-input__note app-input__note--error">
      {{ error }}
    </ion-note>
    <ion-note v-else-if="hint" class="app-input__note">
      {{ hint }}
    </ion-note>
  </div>
</template>

<style scoped>
.app-input {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1, 4px);
}

.app-input__label {
  font-size: var(--font-size-sm, 13px);
  font-weight: var(--font-weight-medium, 500);
  color: var(--color-text, #111827);
}

.app-input__label--error {
  color: var(--color-error, #dc2626);
}

.app-input__field--error {
  --highlight-color-focused: var(--color-error, #dc2626);
  --border-color: var(--color-error, #dc2626);
}

.app-input__note {
  font-size: var(--font-size-xs, 11px);
  color: var(--color-text-muted, #9ca3af);
}

.app-input__note--error {
  color: var(--color-error, #dc2626);
}
</style>
