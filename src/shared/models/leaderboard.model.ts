/**
 * Leaderboard model.
 * Rankings for beauticians (by orders/earnings) and riders (top 3 only).
 */

export interface LeaderboardEntry {
  rank: number
  user_id: string | number
  name: string
  photo_url?: string
  /** Total completed orders (beautician) or trips (rider) */
  count: number
  /** Total earnings for the period */
  earnings?: number
  /** Score used for ranking — may be composite */
  score?: number
  /** Whether this entry belongs to the currently logged-in user */
  is_self?: boolean
}

export type LeaderboardPeriod = 'weekly' | 'monthly' | 'all_time'

export interface LeaderboardData {
  period: LeaderboardPeriod
  role: 'beautician' | 'rider'
  entries: LeaderboardEntry[]
  /** The logged-in user's own entry (may be outside top N) */
  self_entry?: LeaderboardEntry
  /** Whether the full list is visible (permission-gated for riders — top 3 only) */
  is_restricted: boolean
}
