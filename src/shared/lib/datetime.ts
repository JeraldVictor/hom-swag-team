/**
 * datetime.ts
 *
 * Pure utility functions for IST (Indian Standard Time, UTC+5:30) date/time
 * formatting. These functions work correctly regardless of the device's local
 * timezone because they manually apply the IST offset to the UTC timestamp.
 *
 * IST = UTC + 5 hours 30 minutes = UTC + 330 minutes
 */

const IST_OFFSET_MINUTES = 330 // UTC+5:30

/**
 * Convert a UTC Date to the equivalent IST Date object.
 * The returned Date's UTC fields represent the IST wall-clock time.
 */
function toISTDate(isoString: string): Date {
  const utcMs = new Date(isoString).getTime()
  const istMs = utcMs + IST_OFFSET_MINUTES * 60 * 1000
  return new Date(istMs)
}

/**
 * Format an ISO 8601 string as a 12-hour IST time with AM/PM.
 *
 * Examples:
 *   "2026-05-06T10:15:00Z"  → "3:45 PM"  (UTC 10:15 = IST 15:45)
 *   "2026-05-06T00:00:00Z"  → "5:30 AM"  (UTC 00:00 = IST 05:30)
 *
 * @param isoString - An ISO 8601 date-time string (e.g. "2026-05-06T10:15:00Z")
 * @returns A 12-hour time string with AM/PM, e.g. "3:45 PM"
 */
export function formatISTTime(isoString: string): string {
  const ist = toISTDate(isoString)

  // Use UTC getters because we've already shifted the timestamp to IST
  let hours = ist.getUTCHours()
  const minutes = ist.getUTCMinutes()

  const period = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  if (hours === 0) hours = 12 // midnight / noon → 12

  const mm = String(minutes).padStart(2, '0')
  return `${hours}:${mm} ${period}`
}

/**
 * Format an ISO 8601 string as a human-readable IST date.
 *
 * Examples:
 *   "2026-05-06T00:00:00Z"  → "Wed, 6 May 2026"
 *   "2026-01-01T18:30:00Z"  → "Fri, 2 Jan 2026"  (UTC 18:30 = IST 00:00 next day)
 *
 * @param isoString - An ISO 8601 date-time string
 * @returns A human-readable date string, e.g. "Mon, 6 May 2026"
 */
export function formatISTDate(isoString: string): string {
  const ist = toISTDate(isoString)

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]

  const dayName = dayNames[ist.getUTCDay()]
  const day = ist.getUTCDate()
  const month = monthNames[ist.getUTCMonth()]
  const year = ist.getUTCFullYear()

  return `${dayName}, ${day} ${month} ${year}`
}
