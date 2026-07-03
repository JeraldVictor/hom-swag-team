import { describe, expect, it } from 'vitest'
import { ENV } from '@/shared/lib/env'
import { mediaUrl } from '@/shared/lib/media'

const mediaBaseUrl = ENV.VITE_BFF_BASE_URL.replace(/\/+$/, '')

describe('mediaUrl', () => {
  it('prepends the media base URL to relative media paths', () => {
    const url = mediaUrl('/uploads/profile/photo.jpg')

    expect(url).toMatch(/\?t=\d+$/)
    expect(url.startsWith(`${mediaBaseUrl}/uploads/profile/photo.jpg`)).toBe(true)
  })

  it('rewrites customer app stream URLs to the media base URL', () => {
    const url = mediaUrl('https://alpha.homswag.com/stream/products/hero.jpg')

    expect(url).toMatch(/\?t=\d+$/)
    expect(url.startsWith(`${mediaBaseUrl}/stream/products/hero.jpg`)).toBe(true)
  })

  it('keeps non-media absolute URLs unchanged', () => {
    expect(mediaUrl('https://example.com/avatar.jpg')).toMatch(
      /^https:\/\/example\.com\/avatar\.jpg\?t=\d+$/
    )
  })
})
