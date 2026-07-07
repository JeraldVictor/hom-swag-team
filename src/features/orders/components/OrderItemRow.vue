<template>
  <div class="service-lines">
    <div
      v-for="line in serviceLines"
      :key="line.id"
      class="service-line"
      :class="{ 'service-line-muted': line.kind === 'free' }"
    >
      <div class="service-line-marker">
        <img
          v-if="line.imageUrl"
          :src="line.imageUrl"
          :alt="line.title"
          class="service-line-image"
          loading="lazy"
        />
        <Icon v-else :icon="line.icon" />
      </div>

      <div class="service-line-body">
        <div class="service-line-main">
          <div class="service-line-copy">
            <span class="service-line-title">{{ line.title }}</span>
            <span v-if="line.parentTitle" class="service-line-parent">{{ line.parentTitle }}</span>
            <span v-else-if="line.meta" class="service-line-parent">{{ line.meta }}</span>
          </div>
          <div v-if="line.amount !== undefined" class="service-line-price">
            <span v-if="line.priceMeta" class="service-line-price-meta">{{ line.priceMeta }}</span>
            <strong>₹{{ line.amount }}</strong>
          </div>
        </div>

        <div v-if="line.badges.length" class="item-badges">
          <span
            v-for="badge in line.badges"
            :key="badge.label"
            class="ibadge"
            :class="badge.className"
          >
            <Icon v-if="badge.icon" :icon="badge.icon" class="badge-icon" />
            {{ badge.label }}
          </span>
        </div>

        <button
          v-if="line.canUpgrade"
          class="item-upgrade-btn"
          @click="emit('upgrade', item)"
        >
          <Icon icon="lucide:arrow-up-right" class="upgrade-icon" />
          Upgrade
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { mediaUrl } from '@/shared/lib/media'
import type { OrderProduct } from '@/shared/models'
import { getPackageServices } from '../utils/order-item-normalizers'

const props = defineProps<{ item: OrderProduct; canUpgrade?: boolean }>()
const emit = defineEmits<{ upgrade: [item: OrderProduct] }>()

const packageServices = computed(() => getPackageServices(props.item))

interface ServiceLineBadge {
  label: string
  className: string
  icon?: string
}

interface ServiceLine {
  id: string
  title: string
  kind: 'service' | 'option' | 'package-service' | 'free'
  icon: string
  imageUrl?: string
  amount?: number
  priceMeta?: string
  parentTitle?: string
  meta?: string
  canUpgrade: boolean
  badges: ServiceLineBadge[]
}

interface DisplayImage {
  url: string
  alt_text?: string
}

interface OptionDisplayItem {
  product_option_id?: string
  id?: string
  _id?: string
  title?: string
  name?: string
  price?: number
  min_price?: number
  base_price?: number
  quantity?: number
  duration?: number
  duration_minutes?: number
  banner?: DisplayImage
  image?: DisplayImage
  beautician_added?: boolean
}

interface FreeDisplayItem {
  order_free_item_id?: string
  free_product_id?: string
  product_id?: string
  _id?: string
  title?: string
  name?: string
  banner?: DisplayImage
  image?: DisplayImage
  beautician_added?: boolean
}

const selectedOptions = computed<OptionDisplayItem[]>(
  () =>
    props.item.selected_options || (props.item as { options?: OptionDisplayItem[] }).options || []
)

const freeItems = computed<FreeDisplayItem[]>(
  () =>
    props.item.selected_free_items ||
    (props.item as { free_products?: FreeDisplayItem[] }).free_products ||
    []
)

const serviceLines = computed<ServiceLine[]>(() => {
  const lines: ServiceLine[] = []
  const isPackage = props.item.type === 'package' || packageServices.value.length > 0
  const showPackageServicesAsPrimary = isPackage && packageServices.value.length > 0
  const showOptionsAsPrimary = selectedOptions.value.length > 0

  if (!showPackageServicesAsPrimary && !showOptionsAsPrimary) {
    lines.push({
      id: `product-${props.item.order_product_id || props.item.product_id}`,
      title: props.item.title,
      kind: 'service',
      icon: 'lucide:sparkle',
      imageUrl: getImageUrl(props.item),
      amount: props.item.total,
      priceMeta: `${props.item.quantity}×₹${props.item.price}`,
      meta: formatDuration(props.item.duration),
      canUpgrade: Boolean(props.canUpgrade && !props.item.upgrade_info),
      badges: getLineBadges({
        isFree: props.item.total === 0,
        beauticianAdded: props.item.beautician_added,
      }),
    })
  }

  for (const option of selectedOptions.value) {
    const amount = option.price ?? option.min_price ?? option.base_price ?? 0
    lines.push({
      id: `option-${option.product_option_id || option.id || option._id || option.title}`,
      title: option.title || option.name || 'Option',
      kind: 'option',
      icon: 'lucide:plus',
      imageUrl: getImageUrl(option),
      amount,
      meta: formatItemMeta(option.quantity ?? 1, option.duration ?? option.duration_minutes),
      canUpgrade: false,
      badges: getLineBadges({ beauticianAdded: option.beautician_added }),
    })
  }

  for (const service of packageServices.value) {
    lines.push({
      id: `package-service-${service.product_id}`,
      title: service.title,
      kind: 'package-service',
      icon: 'lucide:check',
      imageUrl: getImageUrl(service),
      amount: service.price ?? 0,
      priceMeta: service.price != null ? '1×₹' + service.price : undefined,
      meta: formatItemMeta(1, service.duration),
      canUpgrade: false,
      badges: getLineBadges({
        beauticianAdded: service.beautician_added,
      }),
    })
  }

  for (const freeItem of freeItems.value) {
    lines.push({
      id: `free-${freeItem.order_free_item_id || freeItem.free_product_id || freeItem.product_id || freeItem._id || freeItem.title}`,
      title: freeItem.title || freeItem.name || 'Free item',
      kind: 'free',
      icon: 'lucide:gift',
      imageUrl: getImageUrl(freeItem),
      amount: 0,
      parentTitle: props.item.title,
      canUpgrade: false,
      badges: getLineBadges({
        isFree: true,
        beauticianAdded: freeItem.beautician_added,
      }),
    })
  }

  return lines
})

function formatDuration(duration?: number) {
  return duration ? `${duration}m` : ''
}

function formatItemMeta(quantity: number, duration?: number) {
  return [`Qty ${quantity}`, formatDuration(duration)].filter(Boolean).join(' • ')
}

function getImageUrl(value: {
  banner?: DisplayImage
  image?: DisplayImage
  image_url?: string
  images?: { url: string }[]
}) {
  return mediaUrl(
    value.banner?.url || value.image?.url || value.image_url || value.images?.[0]?.url
  )
}

function getLineBadges({
  isFree = false,
  beauticianAdded = false,
}: {
  isFree?: boolean
  beauticianAdded?: boolean
}): ServiceLineBadge[] {
  const badges: ServiceLineBadge[] = []
  if (isFree) badges.push({ label: 'Free', className: 'ibadge-free' })
  if (beauticianAdded) {
    badges.push({
      label: 'Beautician added',
      className: 'ibadge-beautician',
      icon: 'lucide:user-check',
    })
  }
  return badges
}
</script>

<style scoped>
.service-lines {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.service-line {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 10px;
  padding: 12px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.service-line:nth-child(odd) {
  background: rgba(248, 250, 252, 0.98);
}

.service-line:nth-child(even) {
  background: rgba(99, 102, 241, 0.06);
  border-color: rgba(99, 102, 241, 0.18);
}

.service-line-muted {
  background: rgba(99, 102, 241, 0.04);
  border-color: rgba(99, 102, 241, 0.14);
}

.service-line-marker {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: var(--color-brand);
  background: rgba(99, 102, 241, 0.1);
  flex-shrink: 0;
  overflow: hidden;
}

.service-line-marker svg {
  width: 15px;
  height: 15px;
}

.service-line-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.service-line-body {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}

.service-line-main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.service-line-copy {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.service-line-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.35;
}

.service-line-parent {
  font-size: 11px;
  line-height: 1.35;
  color: var(--color-text-muted);
}

.service-line-price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  flex-shrink: 0;
  color: var(--color-text);
}

.service-line-price-meta {
  font-size: 11px;
  color: var(--color-text-muted);
}

.service-line-price strong {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-brand);
}

.item-badges {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
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

.item-upgrade-btn {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 3px;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1.5px solid var(--color-brand);
  background: rgba(99, 102, 241, 0.07);
  color: var(--color-brand);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.15s;
}

.item-upgrade-btn:active {
  background: rgba(99, 102, 241, 0.18);
}

.upgrade-icon {
  width: 11px;
  height: 11px;
  flex-shrink: 0;
}

.ibadge-beautician {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}

.addon-beautician {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  color: var(--color-text-muted);
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.badge-icon,
.sub-badge-icon {
  width: 12px;
  height: 12px;
}
</style>
