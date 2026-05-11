import type { Product } from './product.model'

/**
 * Main Menu model
 */
export interface MainMenu {
  _id: string
  title: string
  slug: string
  description?: string
  display_order: number
  image?: {
    url: string
  }
  gender_type: 'male' | 'female' | 'unisex'
  categories?: Category[]
}

/**
 * Category model
 */
export interface Category {
  _id: string
  title: string
  slug: string
  description?: string
  display_order: number
  menu_id: string
  image?: {
    url: string
  }
  sub_categories?: SubCategory[]
  products?: Product[]
}

/**
 * Sub-category model
 */
export interface SubCategory {
  _id: string
  title: string
  slug: string
  description?: string
  display_order: number
  category_id: string
  image?: {
    url: string
  }
  products?: Product[]
}

/**
 * Unified Menu response from /menu
 */
export interface MenuResponse {
  main_menus: MainMenu[]
  categories: Category[]
  sub_categories: SubCategory[]
}
