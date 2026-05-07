/**
 * Leaderboard Service
 *
 * Typed wrappers around the BFF leaderboard endpoints.
 * - Beauticians: full leaderboard (permission-gated)
 * - Riders: top 3 only (always restricted)
 */

import apiClient from '@/shared/lib/api'
import type { LeaderboardData, LeaderboardPeriod } from '@/shared/models/leaderboard.model'

/**
 * Fetch the leaderboard for the authenticated user's role.
 * GET /leaderboard
 *
 * The BFF enforces visibility rules:
 * - Riders always receive only the top 3 entries.
 * - Beauticians receive the full list only if the permission flag is enabled.
 */
export async function getLeaderboard(period?: LeaderboardPeriod): Promise<LeaderboardData> {
  const response = await apiClient.get<{ data: LeaderboardData }>('/leaderboard', {
    params: { period },
  })
  return response.data.data
}
