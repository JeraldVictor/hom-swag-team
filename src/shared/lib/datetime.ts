import { format, toZonedTime } from 'date-fns-tz'

/**
 * datetime.ts
 *
 * Utility functions for IST (Indian Standard Time, Asia/Kolkata) date/time
 * formatting using date-fns-tz.
 */

const IST_TIMEZONE = 'Asia/Kolkata'

/**
 * Convert a 24-hour time string or Date input into a 12-hour display string.
 *
 * Examples:
 *   "17:30"          → "5:30 PM"
 *   "00:00"          → "12:00 AM"
 *   "2026-05-06T10:15:00Z" → "3:45 PM"
 *
 * @param value - A 24-hour time string, Date object, or timestamp
 * @returns A 12-hour time string with AM/PM
 */
export function formatTime12(value: string | Date | number): string {
  if (!value) return ''

  if (typeof value === 'string') {
    const cleaned = value.trim()
    if (cleaned === '') return ''

    // Already formatted as 12-hour time.
    if (/(am|pm)$/i.test(cleaned)) {
      return cleaned
    }

    // 24-hour time strings like "17:30" or "09:15:00"
    const timeMatch = /^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(cleaned)
    if (timeMatch) {
      const hours = Number(timeMatch[1])
      const minutes = timeMatch[2]
      const period = hours < 12 ? 'AM' : 'PM'
      const displayHour = hours % 12 || 12
      return `${displayHour}:${minutes} ${period}`
    }

    // Fall back to parsing ISO-style datetime strings.
    const parsed = new Date(cleaned)
    if (!Number.isNaN(parsed.getTime())) {
      return formatISTTime(parsed)
    }

    return cleaned
  }

  if (typeof value === 'number') {
    return formatISTTime(new Date(value))
  }

  return formatISTTime(value)
}

/**
 * Format an ISO 8601 string as a 12-hour IST time with AM/PM.
 *
 * Examples:
 *   "2026-05-06T10:15:00Z"  → "3:45 PM"
 *
 * @param date - An ISO string, Date object, or timestamp
 * @returns A 12-hour time string with AM/PM, e.g. "3:45 PM"
 */
export function formatISTTime(date: string | Date | number): string {
  if (!date) return ''
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return String(date)

  const zonedDate = toZonedTime(d, IST_TIMEZONE)
  return format(zonedDate, 'h:mm aa', { timeZone: IST_TIMEZONE })
}

/**
 * Format an ISO 8601 string as a human-readable IST date.
 *
 * Examples:
 *   "2026-05-06T00:00:00Z"  → "Wed, 6 May 2026"
 */
export function formatISTDate(date: string | Date | number): string {
  if (!date) return ''
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return String(date)

  const zonedDate = toZonedTime(d, IST_TIMEZONE)
  return format(zonedDate, 'EEE, d MMM yyyy', { timeZone: IST_TIMEZONE })
}

/**
 * Format an ISO 8601 string as a YYYY-MM-DD string in IST.
 */
export function formatISTDateShort(date: string | Date | number): string {
  if (!date) return ''
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return String(date)

  const zonedDate = toZonedTime(d, IST_TIMEZONE)
  return format(zonedDate, 'yyyy-MM-dd', { timeZone: IST_TIMEZONE })
}

/**
 * Returns current date in IST as YYYY-MM-DD
 */
export function getTodayIST(): string {
  return format(toZonedTime(new Date(), IST_TIMEZONE), 'yyyy-MM-dd', { timeZone: IST_TIMEZONE })
}
