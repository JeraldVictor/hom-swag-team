/**
 * A service or physical product available in the HomSwag catalogue.
 */
export interface Product {
  id: string | number
  _id?: string
  product_id?: string
  custom_category_id?: string
  name: string
  title?: string // Some APIs use title instead of name
  description?: string
  type: 'service' | 'package'
  price?: number
  min_price: number
  base_price: number
  image_url?: string
  images?: Array<{ url: string }>
  is_active?: boolean
  duration_minutes?: number
  display?: {
    is_active: boolean
    is_featured: boolean
    is_bestseller: boolean
    is_new: boolean
  }
  restrictions?: {
    beautician_only: boolean
    membership_only: boolean
  }
  category_id?: string
  sub_category_id?: string
  /** For packages: configuration of services/items */
  package_config?: {
    choose_any: boolean
    min_selection?: number
    max_selection?: number
    services?: Array<{ _id: string; title: string }>
    selection_type?: 'fixed' | 'limit' | 'choose_any'
  }
  /** Product options (addons/variations) */
  options?: ProductOption[]
  /** Limits for selecting options */
  option_limits?: {
    is_unlimited: boolean
    min_selection?: number
    max_selection?: number
  }
  /** Complimentary free products available with this item */
  free_products?: Array<{ _id: string; product_id?: string; title: string }>
  free_product_limits?: {
    is_unlimited: boolean
    min_qty?: number
    max_qty?: number
  }
}

/**
 * Options/Addons for a product.
 */
export interface ProductOption {
  id?: string | number
  _id?: string
  product_option_id?: string
  title: string
  price?: number
  min_price?: number
  base_price?: number
  is_active?: boolean
}
