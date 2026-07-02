/**
 * Dashboard summary data returned by GET /dashboard
 */
import type { Trip } from './trip.model'

export interface DashboardImage {
  url?: string
  key?: string
}

export interface DashboardData {
  today: string
  today_count: number
  today_completed_count: number
  today_cancelled_count: number
  tomorrow_count: number
  month_completed_count: number
  today_earnings: number
  today_commission: number
  today_petrol_commission?: number
  month_earnings: number
  month_commission: number
  month_petrol_commission?: number
  payable_commission: number
  payable_petrol_commission?: number
  monthly_target: number
  target_achieved: boolean
  pending_leaves_count: number
  unread_notifications_count: number
  trips?: Trip[]
  leave_balance?: Record<string, number>
  office_payment_qr_code?: DashboardImage
}
