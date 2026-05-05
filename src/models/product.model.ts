/**
 * A service or physical product available in the HomSwag catalogue.
 */
export interface Product {
  id: string | number
  name: string
  description?: string
  price: number
  image_url?: string
}
