/**
 * Products Service
 *
 * Typed wrapper around the BFF products endpoint.
 */

import apiClient from '@/shared/lib/api'
import type { Product } from '@/shared/models/product.model'
import type { PaginatedResponse } from '@/shared/models/pagination.model'

/**
 * Fetch a paginated list of products from the catalogue.
 * GET /products
 */
export async function getProducts(
  page?: number,
  limit?: number,
): Promise<PaginatedResponse<Product>> {
  const response = await apiClient.get<{ data: PaginatedResponse<Product> }>('/products', {
    params: { page, limit },
  })
  return response.data.data
}

/**
 * Fetch a single product by ID.
 * GET /products/:id
 */
export async function getProduct(id: string | number): Promise<Product> {
  const response = await apiClient.get<{ data: Product }>(`/products/${id}`)
  return response.data.data
}

/**
 * Fetch products that can be upgraded to from a given product.
 * GET /products/:id/upgradables
 */
export async function getUpgradableProducts(id: string | number): Promise<Product[]> {
  const response = await apiClient.get<{ data: Product[] }>(`/products/${id}/upgradables`)
  return response.data.data
}
