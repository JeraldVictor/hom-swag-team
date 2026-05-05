<script setup lang="ts">
import { IonButton } from '@ionic/vue'
import { computed } from 'vue'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    loading?: boolean
    disabled?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
  }
)

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

/** Map AppButton variant → Ionic color / fill */
const ionColor = computed<string>(() => {
  const map: Record<Variant, string> = {
    primary: 'primary',
    secondary: 'secondary',
    danger: 'danger',
    ghost: 'primary', // ghost uses fill="clear" instead of a different color
  }
  return map[props.variant]
})

const ionFill = computed<string>(() =>
  props.variant === 'ghost' ? 'clear' : 'solid'
)

/** Map AppButton size → Ionic size */
const ionSize = computed<string>(() => {
  const map: Record<Size, string> = {
    sm: 'small',
    md: 'default',
    lg: 'large',
  }
  return map[props.size]
})

const isMuted = computed(() => props.loading || props.disabled)
</script>

<template>
  <ion-button
    :color="ionColor"
    :fill="ionFill"
    :size="ionSize"
    :disabled="disabled || loading"
    :class="{ 'app-btn--muted': isMuted }"
    @click="emit('click', $event)"
  >
    <slot />
  </ion-button>
</template>

<style scoped>
.app-btn--muted {
  opacity: 0.55;
}
</style>
