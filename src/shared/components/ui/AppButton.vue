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
const ionColor = computed<'primary' | 'secondary' | 'danger'>(() => {
  const map: Record<Variant, 'primary' | 'secondary' | 'danger'> = {
    primary: 'primary',
    secondary: 'secondary',
    danger: 'danger',
    ghost: 'primary',
  }
  return map[props.variant]
})

const ionFill = computed<'clear' | 'solid'>(() =>
  props.variant === 'ghost' ? 'clear' : 'solid'
)

/** Map AppButton size → Ionic size */
const ionSize = computed<'small' | 'default' | 'large'>(() => {
  const map: Record<Size, 'small' | 'default' | 'large'> = {
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
ion-button {
  --padding-start: 16px;
  --padding-end: 16px;
  font-weight: 600;
  text-transform: none;
}

/* Add spacing between icon and text inside the button */
ion-button::part(native) {
  gap: 8px;
}

.app-btn--muted {
  opacity: 0.55;
}
</style>
