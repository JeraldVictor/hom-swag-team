import type { OrderAddress } from '@/shared/models/order.model'

function text(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function first(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = text(source[key])
    if (value) return value
  }
  return ''
}

function isGpsLike(value: string): boolean {
  const normalized = value.trim()
  if (!normalized) return false
  if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(normalized)) return true
  return /^[23456789CFGHJMPQRVWX]{4,}\+[23456789CFGHJMPQRVWX]{2,}/i.test(normalized)
}

export function getAddressCoordinates(address: OrderAddress | unknown): {
  latitude: number
  longitude: number
} | null {
  if (!address || typeof address !== 'object') return null
  const source = address as Record<string, unknown>
  const latitude = numberValue(source.latitude)
  const longitude = numberValue(source.longitude)
  if (latitude === null || longitude === null) return null
  return { latitude, longitude }
}

export function getAddressMapUrl(address: OrderAddress | unknown): string {
  const coords = getAddressCoordinates(address)
  if (!coords) return ''
  const query = `${coords.latitude},${coords.longitude}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export function formatAddressLines(address: OrderAddress | unknown): string[] {
  if (!address) return []
  if (typeof address !== 'object') {
    const rawText = text(address)
    return rawText ? [rawText] : []
  }

  const source = address as Record<string, unknown>
  const rows = [
    ['Building', first(source, ['building_info', 'building_name', 'building', 'building_no'])],
    ['Street', first(source, ['street', 'line1'])],
    ['Landmark', first(source, ['landmark'])],
    ['City', first(source, ['city'])],
    ['State', first(source, ['state'])],
    ['Pincode', first(source, ['pincode', 'pin', 'zip'])],
    ['GPS', first(source, ['gps'])],
  ] as const

  const lines = rows.map(([label, value]) => `${label}: ${value || '-'}`)
  const coords = getAddressCoordinates(source)
  lines.push(
    `Lat, Lng: ${coords ? `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}` : '-'}`
  )

  return lines
}

export function formatAddressText(address: OrderAddress | unknown): string {
  const lines = formatAddressLines(address)
  return lines.length ? lines.join('\n') : 'No address provided'
}

export function formatCompactAddress(address: OrderAddress | unknown): string {
  if (!address) return ''
  if (typeof address !== 'object') return text(address)

  const source = address as Record<string, unknown>
  const parts = [
    first(source, ['building_info', 'building_name', 'building', 'building_no']),
    first(source, ['street', 'line1']),
    first(source, ['line2', 'area']),
    first(source, ['city']),
    first(source, ['state']),
    first(source, ['pincode', 'pin', 'zip']),
  ]

  const seen = new Set<string>()
  return parts
    .map(part => part.trim())
    .filter(part => {
      if (!part || isGpsLike(part)) return false
      const key = part.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .join(', ')
}

export function formatPrimaryAddressLine(address: OrderAddress | unknown): string {
  if (!address) return ''
  if (typeof address !== 'object') return text(address)

  const source = address as Record<string, unknown>
  const parts = [
    first(source, ['building_info', 'building_name', 'building', 'building_no']),
    first(source, ['street', 'line1']),
    first(source, ['landmark']),
  ]

  const seen = new Set<string>()
  return parts
    .map(part => part.trim())
    .filter(part => {
      if (!part || isGpsLike(part)) return false
      const key = part.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .join(', ')
}
