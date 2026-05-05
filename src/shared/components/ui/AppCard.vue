<script setup lang="ts">
import { IonCard } from '@ionic/vue'
import { computed } from 'vue'
import { spacing, radius } from '@/core/theme/index'

const props = withDefaults(
  defineProps<{
    /** Inner padding — CSS value or Design_Token spacing key */
    padding?: string
    /** Box-shadow elevation level (0 = none, 1 = subtle, 2 = raised) */
    elevation?: 0 | 1 | 2
    /** Border radius — CSS value or Design_Token radius key */
    borderRadius?: string
  }>(),
  {
    padding: spacing[4],      // 16px
    elevation: 1,
    borderRadius: radius.lg,  // 12px
  }
)

const elevationShadow = computed(() => {
  const shadows: Record<0 | 1 | 2, string> = {
    0: 'none',
    1: '0 1px 4px rgba(0,0,0,0.08)',
    2: '0 4px 12px rgba(0,0,0,0.14)',
  }
  return shadows[props.elevation]
})

const cardStyle = computed(() => ({
  '--padding-start': props.padding,
  '--padding-end': props.padding,
  '--padding-top': props.padding,
  '--padding-bottom': props.padding,
  '--border-radius': props.borderRadius,
  'border-radius': props.borderRadius,
  'box-shadow': elevationShadow.value,
  padding: props.padding,
}))
</script>

<template>
  <ion-card class="app-card" :style="cardStyle">
    <slot />
  </ion-card>
</template>

<style scoped>
.app-card {
  margin: 0;
  background: var(--color-surface, #ffffff);
  border-radius: var(--border-radius, 12px);
}
</style>
