/**
 * Payout History Service
 *
 * Typed wrapper around the BFF monthly payout history endpoint.
 */

import apiClient from '@/shared/lib/api'
import type {
  PayoutComponent,
  PayoutHistoryEntry,
  PayoutHistoryResponse,
} from '@/shared/models/payout-history.model'

interface RawPayoutHistoryPayload {
  data?: PayoutHistoryEntry[]
  entries?: PayoutHistoryEntry[]
  total?: number
  page?: number
  limit?: number
  pages?: number
  hasNextPage?: boolean
  pagination?: {
    total?: number
    page?: number
    limit?: number
    pages?: number
    hasNextPage?: boolean
  }
  summary?: PayoutHistoryResponse['summary']
}

function normalizeEntry(entry: PayoutHistoryEntry): PayoutHistoryEntry {
  const components: PayoutComponent[] =
    entry.components?.length > 0
      ? entry.components
      : [
          {
            type: 'commission',
            label: 'Commission',
            amount: entry.commission_achieved === false ? 0 : (entry.commission_amount ?? 0),
            status: entry.status,
            paid_at: entry.paid_at,
          },
          ...(entry.role === 'rider'
            ? [
                {
                  type: 'petrol' as const,
                  label: 'Petrol',
                  amount: entry.petrol_amount ?? 0,
                  status: entry.status,
                  paid_at: entry.paid_at,
                },
              ]
            : []),
        ]

  return {
    ...entry,
    total_amount: entry.total_amount ?? components.reduce((total, item) => total + item.amount, 0),
    components,
  }
}

/**
 * Fetch current and past monthly payout history for the authenticated worker.
 * GET /payouts
 */
export async function getPayoutHistory(params?: {
  page?: number
  limit?: number
}): Promise<PayoutHistoryResponse> {
  const response = await apiClient.get<{ data: RawPayoutHistoryPayload | PayoutHistoryEntry[] }>(
    '/payouts',
    { params }
  )
  const payload = response.data.data
  const entries = Array.isArray(payload) ? payload : (payload.entries ?? payload.data ?? [])
  const pagination = Array.isArray(payload) ? undefined : payload.pagination
  const page = pagination?.page ?? (Array.isArray(payload) ? params?.page : payload.page) ?? 1
  const limit = pagination?.limit ?? (Array.isArray(payload) ? params?.limit : payload.limit) ?? 10
  const total =
    pagination?.total ?? (Array.isArray(payload) ? entries.length : payload.total) ?? entries.length
  const pages =
    pagination?.pages ?? (Array.isArray(payload) ? Math.ceil(total / limit) : payload.pages) ?? 1

  return {
    entries: entries.map(normalizeEntry),
    summary: Array.isArray(payload) ? undefined : payload.summary,
    total,
    page,
    limit,
    pages,
    hasNextPage:
      pagination?.hasNextPage ?? (!Array.isArray(payload) && payload.hasNextPage) ?? page < pages,
  }
}
