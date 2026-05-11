<script setup lang="ts">
import { computed } from 'vue'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'clear'
type Size = 'sm' | 'md' | 'lg'
type Expand = 'block' | 'full'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    expand?: Expand
    loading?: boolean
    disabled?: boolean
    icon?: string
    iconOnly?: boolean
    href?: string
    target?: string
  }>(),
  {
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
  }
)

const emit = defineEmits<(e: 'click', event: MouseEvent) => void>()

/** Map AppButton variant → Ionic color / fill */
const ionColor = computed(() => {
  if (props.variant === 'danger') return 'danger'
  if (props.variant === 'secondary') return 'secondary'
  return 'primary'
})

const ionFill = computed<'solid' | 'outline' | 'clear'>(() => {
  if (props.variant === 'outline') return 'outline'
  if (props.variant === 'ghost' || props.variant === 'clear') return 'clear'
  return 'solid'
})
</script>

<template>
  <ion-button
    :color="ionColor"
    :fill="ionFill"
    :expand="expand"
    :href="href"
    :target="target"
    :disabled="disabled || loading"
    class="app-btn"
    :class="{ 
      'app-btn--loading': loading,
      'app-btn--icon-only': iconOnly,
      'app-btn--sm': size === 'sm',
      'app-btn--lg': size === 'lg'
    }"
    @click="emit('click', $event)"
  >
    <ion-spinner v-if="loading" name="crescent" class="btn-spinner" />
    <template v-else>
      <Icon v-if="icon" :icon="icon" class="btn-icon" />
      <slot />
    </template>
  </ion-button>
</template>

<style scoped>
/* Base Reset */
ion-button.app-btn {
  --padding-start: 20px;
  --padding-end: 20px;
  --border-radius: 16px;
  --height: 56px;
  --border-width: 2px;
  font-weight: 800;
  text-transform: none;
  margin: 0;
  font-size: 15px;
  letter-spacing: -0.2px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Size: Small */
ion-button.app-btn--sm {
  --height: 42px;
  --padding-start: 14px;
  --padding-end: 14px;
  --border-radius: 12px;
  font-size: 13px;
}

/* Size: Large */
ion-button.app-btn--lg {
  --height: 64px;
  --padding-start: 24px;
  --padding-end: 24px;
  --border-radius: 18px;
  font-size: 17px;
}

/* Icon Only Variation */
ion-button.app-btn--icon-only {
  --padding-start: 0;
  --padding-end: 0;
  width: 56px;
  min-width: 56px;
}

/* Internal Layout */
ion-button::part(native) {
  gap: 12px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-spinner {
  width: 22px;
  height: 22px;
}

.btn-icon {
  font-size: 1.4em;
  flex-shrink: 0;
  margin: 0 0.5rem;
}

/* States */
.app-btn--loading {
  opacity: 0.8;
}

/* Shadow & Depth */
ion-button[fill="solid"] {
  --box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

ion-button[fill="solid"]:active {
  --box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transform: translateY(1px);
}

ion-button[fill="outline"] {
  --background-hover: rgba(var(--color-primary-rgb), 0.04);
}
</style>
