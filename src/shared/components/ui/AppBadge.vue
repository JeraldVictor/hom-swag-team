<script setup lang="ts">
import { computed } from 'vue'

type BadgeVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'brand'
  | 'neutral'
  | 'default'
  | 'danger'

const props = withDefaults(
  defineProps<{
    text?: string
    variant?: BadgeVariant
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    variant: 'default',
    size: 'md',
  }
)

/**
 * Map variant → CSS custom properties defined in variables.css
 */
const badgeStyle = computed(() => {
  const variantStyles: Record<BadgeVariant, { background: string; color: string }> = {
    success: {
      background: 'var(--color-success-bg, #ecfdf5)',
      color: 'var(--color-success-text, #059669)',
    },
    warning: {
      background: 'var(--color-warning-bg, #fffbeb)',
      color: 'var(--color-warning-text, #d97706)',
    },
    error: {
      background: 'var(--color-error-bg, #fef2f2)',
      color: 'var(--color-error-text, #dc2626)',
    },
    danger: {
      background: 'var(--color-error-bg, #fef2f2)',
      color: 'var(--color-error-text, #dc2626)',
    },
    info: {
      background: 'var(--color-info-bg, #eff6ff)',
      color: 'var(--color-info-text, #2563eb)',
    },
    brand: {
      background: 'var(--color-brand-pale, #f5f3ff)',
      color: 'var(--color-brand, #7c3aed)',
    },
    neutral: {
      background: 'var(--color-background, #f3f4f6)',
      color: 'var(--color-text-muted, #6b7280)',
    },
    default: {
      background: 'var(--color-border, #e5e7eb)',
      color: 'var(--color-text, #111827)',
    },
  }
  return variantStyles[props.variant]
})

const sizeStyle = computed(() => {
  const sizeMap: Record<'sm' | 'md' | 'lg', { fontSize: string; padding: string }> = {
    sm: { fontSize: 'var(--font-size-xs, 11px)', padding: '2px 6px' },
    md: { fontSize: 'var(--font-size-sm, 13px)', padding: '3px 8px' },
    lg: { fontSize: 'var(--font-size-base, 15px)', padding: '4px 10px' },
  }
  return sizeMap[props.size]
})

const combinedStyle = computed(() => ({
  ...badgeStyle.value,
  ...sizeStyle.value,
}))
</script>

<template>
  <ion-badge
    class="app-badge"
    :class="`app-badge--${variant}`"
    :style="combinedStyle"
  >
    <slot>{{ text?.toUpperCase() }}</slot>
  </ion-badge>
</template>

<style scoped>
.app-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full, 9999px);
  font-weight: var(--font-weight-medium, 500);
  letter-spacing: 0.01em;
  white-space: nowrap;
}
</style>
