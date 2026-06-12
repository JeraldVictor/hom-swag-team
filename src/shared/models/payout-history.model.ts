/**
 * Monthly payout history for field workers.
 */

export type PayoutRole = 'beautician' | 'rider'
export type PayoutStatus = 'pending' | 'paid' | 'processing' | 'failed'
export type PayoutComponentType = 'commission' | 'petrol'

export interface PayoutComponent {
  type: PayoutComponentType
  label: string
  amount: number
  status?: PayoutStatus
  paid_at?: string | null
  note?: string
}

export interface PayoutHistoryEntry {
  id: string
  month: number
  year: number
  month_label: string
  role: PayoutRole
  commission_achieved?: boolean
  commission_amount?: number
  petrol_amount?: number
  total_amount: number
  status?: PayoutStatus
  paid_at?: string | null
  components: PayoutComponent[]
}

export interface PayoutHistorySummary {
  current_month_total: number
  last_month_total: number
  pending_total: number
  paid_total?: number
}

export interface PayoutHistoryResponse {
  entries: PayoutHistoryEntry[]
  summary?: PayoutHistorySummary
  total: number
  page: number
  limit: number
  pages: number
  hasNextPage: boolean
}
