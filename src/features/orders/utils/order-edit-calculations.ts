export interface OrderEditCalculationOption {
  price?: number
  min_price?: number
  base_price?: number
  quantity?: number
  beautician_added?: boolean
}

export interface OrderEditCalculationPackageService {
  price?: number
  beautician_added?: boolean
}

export interface OrderEditCalculationItem {
  quantity?: number
  price?: number
  type?: 'service' | 'package'
  package_mode?: 'fixed' | 'limit' | 'choose_any'
  beautician_added?: boolean
  selected_options?: readonly OrderEditCalculationOption[]
  selected_package_items?: readonly OrderEditCalculationPackageService[]
}

function nonNegative(value: unknown): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0
}

export function getOrderEditOptionQuantity(option: { quantity?: number }): number {
  const quantity = Number(option.quantity ?? 1)
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1
}

export function getOrderEditOptionPrice(option: OrderEditCalculationOption): number {
  return nonNegative(option.price ?? option.min_price ?? option.base_price)
}

export function getOrderEditLineUnitPrice(item: OrderEditCalculationItem): number {
  if (item.selected_options?.length) {
    return item.selected_options.reduce(
      (sum, option) => sum + getOrderEditOptionPrice(option) * getOrderEditOptionQuantity(option),
      0
    )
  }

  if (
    item.type === 'package' &&
    item.package_mode &&
    item.package_mode !== 'fixed' &&
    item.selected_package_items?.length
  ) {
    return item.selected_package_items.reduce((sum, service) => sum + nonNegative(service.price), 0)
  }

  return nonNegative(item.price)
}

export function getOrderEditLineTotal(item: OrderEditCalculationItem): number {
  const quantity = Number(item.quantity ?? 1)
  const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1
  return Number((getOrderEditLineUnitPrice(item) * safeQuantity).toFixed(2))
}

export function calculateOrderEditDiscountEligibleSubtotal(
  items: readonly OrderEditCalculationItem[] = []
): number {
  return items.reduce((sum, item) => {
    if (item.beautician_added) return sum

    const addedOptionsTotal = (item.selected_options ?? []).reduce(
      (optionSum, option) =>
        option.beautician_added
          ? optionSum + getOrderEditOptionPrice(option) * getOrderEditOptionQuantity(option)
          : optionSum,
      0
    )
    const addedPackageServicesTotal = (item.selected_package_items ?? []).reduce(
      (serviceSum, service) =>
        service.beautician_added ? serviceSum + nonNegative(service.price) : serviceSum,
      0
    )

    return (
      sum + Math.max(0, getOrderEditLineTotal(item) - addedOptionsTotal - addedPackageServicesTotal)
    )
  }, 0)
}

export function calculateOrderEditEffectiveDiscountTotal(
  discountTotal: number,
  items: readonly OrderEditCalculationItem[] = []
): number {
  return Math.min(nonNegative(discountTotal), calculateOrderEditDiscountEligibleSubtotal(items))
}
