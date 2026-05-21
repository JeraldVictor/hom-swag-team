<template>
  <div class="item-row">
    <!-- Main row: title + price -->
    <div class="item-main-row">
      <div class="item-title-col">
        <span class="item-title">{{ item.title }}</span>
        <div class="item-badges" v-if="item.total === 0 || item.type === 'package'">
          <span v-if="item.total === 0" class="ibadge ibadge-free">Free</span>
          <span v-if="item.type === 'package'" class="ibadge ibadge-pkg">Package</span>
        </div>
      </div>
      <div class="item-price-col">
        <span class="item-qty-price">{{ item.quantity }}×₹{{ item.price }}</span>
        <span class="item-total">₹{{ item.total }}</span>
      </div>
    </div>

    <!-- Meta chips: duration + type -->
    <div v-if="item.duration || item.type" class="item-meta-row">
      <span v-if="item.duration" class="meta-chip">
        <Icon icon="lucide:clock" class="chip-icon" />{{ item.duration }}m
      </span>
      <span v-if="item.type" class="meta-chip">
        <Icon icon="lucide:layers" class="chip-icon" />{{ item.type === 'package' ? 'Package' : 'Service' }}
      </span>
    </div>

    <!-- Package included services -->
    <div v-if="packageServices.length" class="item-subs">
      <span v-for="s in packageServices" :key="s.product_id || s._id" class="sub-tag">
        <Icon icon="lucide:check" class="sub-icon" />{{ s.title || s.name }}
      </span>
    </div>

    <!-- Add-ons / options -->
    <div v-if="selectedOptions.length" class="item-addons">
      <div
        v-for="opt in selectedOptions"
        :key="opt.product_option_id || opt.id || opt._id"
        class="addon-row"
      >
        <span class="addon-name">+ {{ opt.title }}</span>
        <span class="addon-price">₹{{ opt.price ?? opt.min_price ?? opt.base_price ?? 0 }}</span>
      </div>
    </div>

    <!-- Free perks -->
    <div v-if="freeItems.length" class="item-subs">
      <span v-for="f in freeItems" :key="f.product_id || f._id" class="sub-tag sub-tag-gift">
        <Icon icon="lucide:gift" class="sub-icon" />{{ f.title }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { OrderProduct } from '@/shared/models'

const props = defineProps<{ item: OrderProduct }>()

const packageServices = computed(
  () =>
    props.item.selected_package_items ||
    (props.item as any).services ||
    (props.item as any).package_services ||
    []
)

const selectedOptions = computed(
  () => props.item.selected_options || (props.item as any).options || []
)

const freeItems = computed(
  () => props.item.selected_free_items || (props.item as any).free_products || []
)
</script>

<style scoped>
.item-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  background: var(--color-background);
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.item-main-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.item-title-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.item-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.3;
}

.item-badges {
  display: flex;
  gap: 4px;
}

.ibadge {
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.ibadge-free {
  background: rgba(16, 185, 129, 0.1);
  color: var(--color-success, #10b981);
}

.ibadge-pkg {
  background: rgba(99, 102, 241, 0.1);
  color: var(--color-brand);
}

.item-price-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  flex-shrink: 0;
}

.item-qty-price {
  font-size: 11px;
  color: var(--color-text-muted);
}

.item-total {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-brand);
}

/* Meta chips */
.item-meta-row {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: var(--color-text-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 2px 7px;
}

.chip-icon {
  font-size: 10px;
}

/* Sub-tags (package services, free items) */
.item-subs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.sub-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: var(--color-text-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 2px 8px;
}

.sub-tag-gift {
  color: var(--color-brand);
  border-color: rgba(99, 102, 241, 0.2);
  background: rgba(99, 102, 241, 0.05);
}

.sub-icon {
  font-size: 10px;
}

/* Add-ons */
.item-addons {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-top: 5px;
  border-top: 1px dashed var(--color-border);
}

.addon-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.addon-name {
  color: var(--color-text-muted);
}

.addon-price {
  font-weight: 600;
  color: var(--color-text);
}
</style>
