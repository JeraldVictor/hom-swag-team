/**
 * Generic wrapper for paginated list responses from the BFF API.
 *
 * @template T — the type of each item in the `data` array
 */
export interface PaginatedResponse<T> {
  data: T[]
  /** Total number of records across all pages */
  total: number
  /** Current page number (1-based) */
  page: number
  /** Maximum number of records per page */
  limit: number
}
