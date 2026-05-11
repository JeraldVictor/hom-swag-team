<template>
  <div class="places-search" :class="{ 'places-search--focused': isFocused }">
    <!-- Input row -->
    <div class="places-search__input-row">
      <span class="places-search__icon" aria-hidden="true">
        <Icon :icon="icon" />
      </span>

      <input
        ref="inputEl"
        v-model="query"
        class="places-search__input"
        type="text"
        :placeholder="placeholder"
        :aria-label="label"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        @focus="isFocused = true"
        @blur="handleBlur"
        @input="onInput"
        @keydown.enter.prevent="onEnterKey"
        @keydown.escape="clearAndClose"
      />

      <!-- Clear button -->
      <button
        v-if="query.length > 0"
        class="places-search__clear"
        aria-label="Clear search"
        type="button"
        @mousedown.prevent
        @click="clearAndClose"
      >
        <Icon icon="lucide:x" />
      </button>

      <!-- Loading spinner -->
      <span v-if="isLoading" class="places-search__spinner" aria-hidden="true" />
    </div>

    <!-- Suggestions dropdown -->
    <Transition name="suggestions-fade">
      <ul
        v-if="isFocused && (suggestions.length > 0 || latLngResult)"
        class="places-search__suggestions"
        role="listbox"
        :aria-label="`${label} suggestions`"
      >
        <!-- Lat/Lng direct result -->
        <li
          v-if="latLngResult"
          class="places-search__suggestion places-search__suggestion--latlng"
          role="option"
          @mousedown.prevent
          @click="selectLatLng"
        >
          <Icon icon="lucide:crosshair" class="places-search__suggestion-icon" aria-hidden="true" />
          <div class="places-search__suggestion-text">
            <span class="places-search__suggestion-main">Use coordinates</span>
            <span class="places-search__suggestion-sub">{{ latLngResult.address }}</span>
          </div>
        </li>

        <!-- Autocomplete predictions -->
        <li
          v-for="prediction in suggestions"
          :key="prediction.place_id"
          class="places-search__suggestion"
          role="option"
          @mousedown.prevent
          @click="selectPredictionItem(prediction)"
        >
          <Icon icon="lucide:map-pin" class="places-search__suggestion-icon" aria-hidden="true" />
          <div class="places-search__suggestion-text">
            <span class="places-search__suggestion-main">
              {{ prediction.structured_formatting.main_text }}
            </span>
            <span class="places-search__suggestion-sub">
              {{ prediction.structured_formatting.secondary_text }}
            </span>
          </div>
        </li>
      </ul>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { usePlacesSearch } from '@/shared/composables/usePlacesSearch'
import type { PlaceResult } from '@/shared/models/location.model'

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  /** Accessible label for the input */
  label: string
  /** Input placeholder text */
  placeholder?: string
  /** Lucide icon name for the left icon */
  icon?: string
  /** Pre-filled value (address string) */
  modelValue?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search address or enter lat, lng',
  icon: 'lucide:map-pin',
  modelValue: '',
})

// ── Emits ──────────────────────────────────────────────────────────────────

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'place-selected', place: PlaceResult): void
}>()

// ── State ──────────────────────────────────────────────────────────────────

const isFocused = ref(false)
const inputEl = ref<HTMLInputElement | null>(null)

const {
  query,
  suggestions,
  isLoading,
  fetchSuggestions,
  selectPrediction,
  parseLatLng,
  clearSuggestions,
} = usePlacesSearch()

// Sync modelValue → query on mount / prop change
watch(
  () => props.modelValue,
  val => {
    if (val !== query.value) query.value = val
  },
  { immediate: true }
)

// Detect if the current query looks like a lat,lng pair
const latLngResult = computed(() => {
  const q = query.value.trim()
  if (q.length < 3) return null
  return parseLatLng(q)
})

// ── Handlers ───────────────────────────────────────────────────────────────

function onInput(): void {
  emit('update:modelValue', query.value)
  fetchSuggestions()
}

function handleBlur(): void {
  // Small delay so click on suggestion fires before blur hides the list
  setTimeout(() => {
    isFocused.value = false
    clearSuggestions()
  }, 150)
}

async function selectPredictionItem(
  prediction: google.maps.places.AutocompletePrediction
): Promise<void> {
  const place = await selectPrediction(prediction)
  if (place) {
    query.value = place.address
    emit('update:modelValue', place.address)
    emit('place-selected', place)
  }
  isFocused.value = false
}

function selectLatLng(): void {
  if (!latLngResult.value) return
  query.value = latLngResult.value.address
  emit('update:modelValue', latLngResult.value.address)
  emit('place-selected', latLngResult.value)
  isFocused.value = false
  clearSuggestions()
}

function onEnterKey(): void {
  // If there's a lat/lng result, select it on Enter
  if (latLngResult.value) {
    selectLatLng()
    return
  }
  // Otherwise select the first suggestion
  if (suggestions.value.length > 0) {
    selectPredictionItem(suggestions.value[0])
  }
}

function clearAndClose(): void {
  query.value = ''
  emit('update:modelValue', '')
  clearSuggestions()
  isFocused.value = false
}
</script>

<style scoped>
.places-search {
  position: relative;
  width: 100%;
}

/* ── Input row ───────────────────────────────────────────────────────────── */

.places-search__input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 0 12px;
  height: 48px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.places-search--focused .places-search__input-row {
  border-color: var(--color-brand);
  box-shadow: 0 0 0 3px var(--color-brand-pale);
}

.places-search__icon {
  font-size: 18px;
  color: var(--color-text-muted);
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.places-search__input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--font-size-base);
  color: var(--color-text);
  min-width: 0;
}

.places-search__input::placeholder {
  color: var(--color-text-muted);
}

.places-search__clear {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--color-text-muted);
  font-size: 16px;
  display: flex;
  align-items: center;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.places-search__clear:active {
  color: var(--color-text);
}

.places-search__spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-brand);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

/* ── Suggestions dropdown ────────────────────────────────────────────────── */

.places-search__suggestions {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  list-style: none;
  margin: 0;
  padding: 6px 0;
  z-index: 9999;
  max-height: 280px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.places-search__suggestion {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  cursor: pointer;
  transition: background 0.1s ease;
}

.places-search__suggestion:active,
.places-search__suggestion:hover {
  background: var(--color-brand-pale);
}

.places-search__suggestion--latlng {
  border-bottom: 1px solid var(--color-border);
}

.places-search__suggestion-icon {
  font-size: 18px;
  color: var(--color-brand);
  flex-shrink: 0;
  margin-top: 1px;
}

.places-search__suggestion-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.places-search__suggestion-main {
  font-size: var(--font-size-base);
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.places-search__suggestion-sub {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Transition ──────────────────────────────────────────────────────────── */

.suggestions-fade-enter-active,
.suggestions-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.suggestions-fade-enter-from,
.suggestions-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
