<script setup lang="ts">
import { IonAvatar } from '@ionic/vue'
import { computed, ref } from 'vue'
import { colors } from '@/core/theme/index'

const props = withDefaults(
  defineProps<{
    initials?: string
    imageUrl?: string
    size?: number | string
    backgroundColor?: string
  }>(),
  {
    initials: '',
    imageUrl: undefined,
    size: 40,
    backgroundColor: colors.brandPale,
  }
)

const imgError = ref(false)

const showImage = computed(() => !!props.imageUrl && !imgError.value)

const sizeValue = computed(() =>
  typeof props.size === 'number' ? `${props.size}px` : props.size
)

const avatarStyle = computed(() => ({
  width: sizeValue.value,
  height: sizeValue.value,
  '--size': sizeValue.value,
}))

const initialsStyle = computed(() => ({
  width: sizeValue.value,
  height: sizeValue.value,
  backgroundColor: props.backgroundColor,
  color: colors.brand,
  fontSize: `calc(${sizeValue.value} * 0.38)`,
}))

function onImgError() {
  imgError.value = true
}
</script>

<template>
  <ion-avatar class="app-avatar" :style="avatarStyle">
    <img
      v-if="showImage"
      :src="imageUrl"
      :alt="initials || 'avatar'"
      @error="onImgError"
    />
    <div v-else class="app-avatar__initials" :style="initialsStyle">
      {{ initials }}
    </div>
  </ion-avatar>
</template>

<style scoped>
.app-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: var(--radius-full, 9999px);
  flex-shrink: 0;
}

.app-avatar__initials {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-weight: var(--font-weight-semibold, 600);
  text-transform: uppercase;
  border-radius: var(--radius-full, 9999px);
  user-select: none;
}
</style>
