/**
 * Calendar Service
 *
 * Typed wrapper around the BFF calendar endpoint.
 */

import apiClient from '@/shared/lib/api'
import type { CalendarData } from '@/shared/models/calendar.model'

/**
 * Fetch combined calendar data (leaves, orders/trips, holidays) for a date range.
 * GET /calendar
 */
export async function getCalendar(startDate: string, endDate: string): Promise<CalendarData> {
  const response = await apiClient.get<{ data: CalendarData }>('/calendar', {
    params: { start_date: startDate, end_date: endDate },
  })
  return response.data.data
}
