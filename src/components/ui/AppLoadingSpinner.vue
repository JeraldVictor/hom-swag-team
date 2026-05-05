<script setup lang="ts">
import { IonSpinner } from '@ionic/vue'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg'
    name?: 'bubbles' | 'circles' | 'circular' | 'crescent' | 'dots' | 'lines' | 'lines-sharp' | 'lines-small'
  }>(),
  {
    size: 'md',
    name: 'crescent',
  }
)

const spinnerStyle = computed(() => {
  const sizeMap: Record<'sm' | 'md' | 'lg', string> = {
    sm: '20px',
    md: '32px',
    lg: '48px',
  }
  const px = sizeMap[props.size]
  return { width: px, height: px }
})
</script>

<template>
  <ion-spinner
    class="app-spinner"
    :name="name"
    :style="spinnerStyle"
  />
</template>

<style scoped>
.app-spinner {
  color: var(--color-brand, #7c3aed);
}
</style>
