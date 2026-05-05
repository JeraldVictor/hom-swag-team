<script setup lang="ts">
import { IonBadge } from '@ionic/vue'
import { computed } from 'vue'

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default'

const props = withDefaults(
  defineProps<{
    text: string
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
 * (status color groups from Design_Token)
 */
const badgeStyle = computed(() => {
  const variantStyles: Record<BadgeVariant, { background: string; color: string }> = {
    success: {
      background: 'var(--color-success-bg)',
      color: 'var(--color-success-text)',
    },
    warning: {
      background: 'var(--color-warning-bg)',
      color: 'var(--color-warning-text)',
    },
    error: {
      background: 'var(--color-error-bg)',
      color: 'var(--color-error-text)',
    },
    info: {
      background: 'var(--color-info-bg)',
      color: 'var(--color-info-text)',
    },
    default: {
      background: 'var(--color-border)',
      color: 'var(--color-text)',
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
    {{ text }}
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
