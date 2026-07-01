/**
 * Generic wrapper for paginated list responses from the BFF API.
 *
 * @template T — the type of each item in the `data` array
 */
export interface PaginatedResponse<T> {
  data: T[]
  /** Total number of records across all pages */
  total: number
  /** Number of records in the current page */
  count?: number
  /** Current page number (1-based) */
  page: number
  /** Maximum number of records per page */
  limit: number
  /** Total number of pages */
  pages?: number
  /** Whether there is a next page */
  hasNextPage?: boolean
  /** Whether there is a previous page */
  hasPrevPage?: boolean
  /** Optional server-side counts for filter tabs */
  statusCounts?: Record<string, number>
}
