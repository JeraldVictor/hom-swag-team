import { describe, it, expect } from 'vitest'
import { formatISTDateShort } from '@/shared/lib/datetime'

describe('formatISTDateShort', () => {
  it('formats UTC midnight to IST morning date correctly', () => {
    // UTC: 2026-05-06 00:00:00
    // IST: 2026-05-06 05:30:00
    const iso = '2026-05-06T00:00:00Z'
    expect(formatISTDateShort(iso)).toBe('2026-05-06')
  })

  it('formats UTC evening to next day IST correctly', () => {
    // UTC: 2026-05-06 20:00:00
    // IST: 2026-05-07 01:30:00
    const iso = '2026-05-06T20:00:00Z'
    expect(formatISTDateShort(iso)).toBe('2026-05-07')
  })

  it('formats local-like ISO strings correctly', () => {
    // If no Z is provided, Date constructor might use local time, 
    // but our utility expects standard ISO.
    const iso = '2026-05-06T10:00:00'
    // 10:00 + 5:30 = 15:30 same day
    expect(formatISTDateShort(iso)).toBe('2026-05-06')
  })
})
