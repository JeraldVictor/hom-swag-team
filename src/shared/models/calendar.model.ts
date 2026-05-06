/**
 * A calendar event entry (leave, order/trip, or holiday).
 */
export interface CalendarEvent {
  date: string
  type: 'leave' | 'order' | 'trip' | 'holiday'
  title?: string
  status?: string
  id?: string
  [key: string]: unknown
}

/**
 * Calendar data returned by GET /calendar
 */
export interface CalendarData {
  leaves?: CalendarEvent[]
  orders?: CalendarEvent[]
  trips?: CalendarEvent[]
  holidays?: CalendarEvent[]
  /** Raw data keyed by date */
  [key: string]: unknown
}
