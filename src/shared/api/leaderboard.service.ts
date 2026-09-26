/**
 * Leaderboard Service
 *
 * Typed wrappers around the BFF leaderboard endpoints.
 * Both beautician and rider leaderboards return at most the top 5 entries.
 */

import apiClient from '@/shared/lib/api'
import type { LeaderboardData, LeaderboardPeriod } from '@/shared/models/leaderboard.model'

/**
 * Fetch the leaderboard for the authenticated user's role.
 * GET /leaderboard
 *
 * The BFF enforces permission checks and limits field users to the top 5 entries.
 */
export async function getLeaderboard(period?: LeaderboardPeriod): Promise<LeaderboardData> {
  const response = await apiClient.get<{ data: LeaderboardData }>('/leaderboard', {
    params: { period },
  })
  return response.data.data
}
