/**
 * Dashboard summary data returned by GET /dashboard
 */
export interface DashboardData {
  /** Total orders/trips today */
  today_count?: number
  /** Total completed this month */
  month_count?: number
  /** Earnings today */
  today_earnings?: number
  /** Earnings this month */
  month_earnings?: number
  /** Upcoming orders/trips */
  upcoming?: unknown[]
  /** Recent activity */
  recent?: unknown[]
  /** Leave balance summary */
  leave_balance?: Record<string, number>
  /** Any additional fields from the API */
  [key: string]: unknown
}
