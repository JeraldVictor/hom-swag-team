/**
 * A calendar event entry shown on the calendar.
 * Only leave, OT, weekly-off, and holiday events are displayed.
 */
export type CalendarEventType =
  | 'paid_leave'
  | 'sick_leave'
  | 'loss_of_pay'
  | 'block_time'
  | 'ot'
  | 'weekly_off'
  | 'holiday'

export interface CalendarEvent {
  /** ISO 8601 date string (YYYY-MM-DD) */
  date: string
  type: CalendarEventType
  title: string
  /** Approval status of the underlying request */
  status: 'requested' | 'approved' | 'rejected'
  id?: string | number
  /** Extra detail — e.g. "Full Day", "04:30 PM - 05:30 PM", "2 hrs OT", "Monday" */
  detail?: string
}

/**
 * Calendar data returned by GET /calendar (legacy BFF shape — kept for compatibility).
 */
export interface CalendarData {
  leaves?: CalendarEvent[]
  week_offs?: CalendarEvent[]
  ot_entries?: CalendarEvent[]
  orders?: CalendarEvent[]
  trips?: CalendarEvent[]
  holidays?: CalendarEvent[]
  [key: string]: unknown
}
