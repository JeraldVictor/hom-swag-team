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
  month_earnings: number
  pending_leaves_count: number
  unread_notifications_count: number
  today_orders?: Order[]
  trips?: Trip[]
  leave_balance?: Record<string, number>
}
