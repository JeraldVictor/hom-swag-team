<script setup lang="ts">
import { computed } from 'vue'

type LabelVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'caption' | 'span'

const props = withDefaults(
  defineProps<{
    variant?: LabelVariant
  }>(),
  {
    variant: 'body',
  }
)

/**
 * Map variant → HTML semantic element
 * h1–h6 → <h1>–<h6>
 * body  → <p>
 * caption → <span>
 * span  → <span>
 * default → <p>
 */
const tag = computed<string>(() => {
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(props.variant)) {
    return props.variant
  }
  if (props.variant === 'caption' || props.variant === 'span') {
    return 'span'
  }
  return 'p'
})
</script>

<template>
  <component
    :is="tag"
    class="app-label"
    :class="`app-label--${variant}`"
  >
    <slot />
  </component>
</template>

<style scoped>
.app-label {
  margin: 0;
  color: var(--color-text, #111827);
  font-family: var(--ion-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif);
}

.app-label--h1 { font-size: var(--font-size-4xl, 36px); font-weight: var(--font-weight-bold, 700); }
.app-label--h2 { font-size: var(--font-size-3xl, 30px); font-weight: var(--font-weight-bold, 700); }
.app-label--h3 { font-size: var(--font-size-2xl, 24px); font-weight: var(--font-weight-semibold, 600); }
.app-label--h4 { font-size: var(--font-size-xl, 20px); font-weight: var(--font-weight-semibold, 600); }
.app-label--h5 { font-size: var(--font-size-lg, 18px); font-weight: var(--font-weight-medium, 500); }
.app-label--h6 { font-size: var(--font-size-md, 16px); font-weight: var(--font-weight-medium, 500); }
.app-label--body { font-size: var(--font-size-base, 15px); font-weight: var(--font-weight-regular, 400); }
.app-label--caption { font-size: var(--font-size-xs, 11px); font-weight: var(--font-weight-regular, 400); color: var(--color-text-muted, #9ca3af); }
.app-label--span { font-size: inherit; font-weight: inherit; }
</style>
