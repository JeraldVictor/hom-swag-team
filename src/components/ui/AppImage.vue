<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    src: string
    alt?: string
    fallbackSrc?: string
    width?: string | number
    height?: string | number
  }>(),
  {
    alt: '',
    fallbackSrc: undefined,
    width: undefined,
    height: undefined,
  }
)

const currentSrc = ref(props.src)
const hasFailed = ref(false)

function onError() {
  if (!hasFailed.value && props.fallbackSrc) {
    hasFailed.value = true
    currentSrc.value = props.fallbackSrc
  }
}
</script>

<template>
  <img
    class="app-image"
    :src="currentSrc"
    :alt="alt"
    :width="width"
    :height="height"
    loading="lazy"
    @error="onError"
  />
</template>

<style scoped>
.app-image {
  display: block;
  max-width: 100%;
  object-fit: cover;
}
</style>
