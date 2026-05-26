/**
 * Dashboard summary data returned by GET /dashboard
 */
import type { Order } from './order.model'
import type { Trip } from './trip.model'

export interface DashboardData {
  today: string
  today_count: number
  today_completed_count: number
  today_cancelled_count: number
  tomorrow_count: number
  month_completed_count: number
  today_earnings: number
  today_commission: number
  month_earnings: number
  month_commission: number
  payable_commission: number
  monthly_target: number
  target_achieved: boolean
  pending_leaves_count: number
  unread_notifications_count: number
  trips?: Trip[]
  leave_balance?: Record<string, number>
}
