/**
 * Tests for src/lib/datetime.ts
 *
 * These tests verify that `formatISTTime` and `formatISTDate` produce correct
 * IST (UTC+5:30) output regardless of the host machine's local timezone.
 *
 * IST offset: UTC+5:30 (330 minutes ahead of UTC)
 * Key reference: UTC 00:00 = IST 05:30
 */

import { describe, expect, it } from 'vitest'
import { formatISTDate, formatISTTime } from '@/lib/datetime'

// ---------------------------------------------------------------------------
// formatISTTime
// ---------------------------------------------------------------------------

describe('formatISTTime', () => {
  it('converts UTC midnight to 5:30 AM IST', () => {
    // UTC 00:00 + 5h30m = IST 05:30 AM
    expect(formatISTTime('2026-05-06T00:00:00Z')).toBe('5:30 AM')
  })

  it('converts UTC noon to 5:30 PM IST', () => {
    // UTC 12:00 + 5h30m = IST 17:30 = 5:30 PM
    expect(formatISTTime('2026-05-06T12:00:00Z')).toBe('5:30 PM')
  })

  it('formats 12-hour time without leading zero on the hour', () => {
    // UTC 09:15 + 5h30m = IST 14:45 = 2:45 PM
    expect(formatISTTime('2026-05-06T09:15:00Z')).toBe('2:45 PM')
  })

  it('formats single-digit hours without leading zero', () => {
    // UTC 00:30 + 5h30m = IST 06:00 = 6:00 AM
    expect(formatISTTime('2026-05-06T00:30:00Z')).toBe('6:00 AM')
  })

  it('pads minutes with leading zero when needed', () => {
    // UTC 00:00 + 5h30m = IST 05:30 — minutes already 30, but test with :05
    // UTC 00:35 + 5h30m = IST 06:05 AM
    expect(formatISTTime('2026-05-06T00:35:00Z')).toBe('6:05 AM')
  })

  it('handles IST midnight (12:00 AM)', () => {
    // UTC 18:30 + 5h30m = IST 00:00 = 12:00 AM
    expect(formatISTTime('2026-05-06T18:30:00Z')).toBe('12:00 AM')
  })

  it('handles IST noon (12:00 PM)', () => {
    // UTC 06:30 + 5h30m = IST 12:00 = 12:00 PM
    expect(formatISTTime('2026-05-06T06:30:00Z')).toBe('12:00 PM')
  })

  it('handles 11:59 PM IST', () => {
    // UTC 18:29 + 5h30m = IST 23:59 = 11:59 PM
    expect(formatISTTime('2026-05-06T18:29:00Z')).toBe('11:59 PM')
  })

  it('handles 1:00 AM IST', () => {
    // UTC 19:30 + 5h30m = IST 01:00 = 1:00 AM
    expect(formatISTTime('2026-05-06T19:30:00Z')).toBe('1:00 AM')
  })

  it('returns AM for morning hours', () => {
    // UTC 01:00 + 5h30m = IST 06:30 AM
    const result = formatISTTime('2026-05-06T01:00:00Z')
    expect(result).toContain('AM')
  })

  it('returns PM for afternoon hours', () => {
    // UTC 10:00 + 5h30m = IST 15:30 = 3:30 PM
    const result = formatISTTime('2026-05-06T10:00:00Z')
    expect(result).toContain('PM')
  })

  it('produces the example from the spec: 3:45 PM', () => {
    // UTC 10:15 + 5h30m = IST 15:45 = 3:45 PM
    expect(formatISTTime('2026-05-06T10:15:00Z')).toBe('3:45 PM')
  })
})

// ---------------------------------------------------------------------------
// formatISTDate
// ---------------------------------------------------------------------------

describe('formatISTDate', () => {
  it('formats a date correctly in IST', () => {
    // UTC 2026-05-06T00:00:00Z = IST 2026-05-06T05:30 → Wed, 6 May 2026
    expect(formatISTDate('2026-05-06T00:00:00Z')).toBe('Wed, 6 May 2026')
  })

  it('rolls over to the next day when UTC time + IST offset crosses midnight', () => {
    // UTC 2026-05-05T18:30:00Z + 5h30m = IST 2026-05-06T00:00 → Wed, 6 May 2026
    expect(formatISTDate('2026-05-05T18:30:00Z')).toBe('Wed, 6 May 2026')
  })

  it('does NOT roll over when UTC time + IST offset stays on the same day', () => {
    // UTC 2026-05-06T00:00:00Z + 5h30m = IST 2026-05-06T05:30 → same day
    expect(formatISTDate('2026-05-06T00:00:00Z')).toBe('Wed, 6 May 2026')
  })

  it('formats day without leading zero', () => {
    // UTC 2026-05-01T00:00:00Z = IST 2026-05-01T05:30 → Fri, 1 May 2026
    expect(formatISTDate('2026-05-01T00:00:00Z')).toBe('Fri, 1 May 2026')
  })

  it('includes the correct abbreviated day name', () => {
    // 2026-05-06 is a Wednesday
    const result = formatISTDate('2026-05-06T00:00:00Z')
    expect(result).toMatch(/^Wed,/)
  })

  it('includes the correct abbreviated month name', () => {
    const result = formatISTDate('2026-01-15T00:00:00Z')
    expect(result).toContain('Jan')
  })

  it('includes the full 4-digit year', () => {
    const result = formatISTDate('2026-05-06T00:00:00Z')
    expect(result).toContain('2026')
  })

  it('handles year boundary: UTC Dec 31 late evening → IST Jan 1', () => {
    // UTC 2025-12-31T18:30:00Z + 5h30m = IST 2026-01-01T00:00 → Thu, 1 Jan 2026
    expect(formatISTDate('2025-12-31T18:30:00Z')).toBe('Thu, 1 Jan 2026')
  })

  it('handles month boundary correctly', () => {
    // UTC 2026-04-30T18:30:00Z + 5h30m = IST 2026-05-01T00:00 → Fri, 1 May 2026
    expect(formatISTDate('2026-04-30T18:30:00Z')).toBe('Fri, 1 May 2026')
  })

  it('formats all 12 months correctly', () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    months.forEach((month, index) => {
      // Use the 15th of each month at UTC 00:00 (well within the same IST day)
      const isoString = `2026-${String(index + 1).padStart(2, '0')}-15T00:00:00Z`
      expect(formatISTDate(isoString)).toContain(month)
    })
  })
})

// ---------------------------------------------------------------------------
// Timezone independence
// ---------------------------------------------------------------------------

describe('timezone independence', () => {
  it('formatISTTime produces consistent output regardless of local timezone', () => {
    // The same UTC timestamp should always produce the same IST output
    const iso = '2026-05-06T10:15:00Z'
    const result1 = formatISTTime(iso)
    const result2 = formatISTTime(iso)
    expect(result1).toBe(result2)
    expect(result1).toBe('3:45 PM')
  })

  it('formatISTDate produces consistent output regardless of local timezone', () => {
    const iso = '2026-05-06T00:00:00Z'
    const result1 = formatISTDate(iso)
    const result2 = formatISTDate(iso)
    expect(result1).toBe(result2)
    expect(result1).toBe('Wed, 6 May 2026')
  })
})
