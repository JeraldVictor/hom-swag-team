import { ENV } from '@/shared/lib/env'

const MEDIA_BASE_URL =
  ENV.VITE_BFF_BASE_URL || bffBaseUrlFromApiUrl(ENV.VITE_BFF_API_URL) || ENV.VITE_MEDIA_BASE_URL

let mediaBuster = Date.now()

function bffBaseUrlFromApiUrl(apiUrl?: string): string {
  if (!apiUrl || !apiUrl.startsWith('http')) return ''
  try {
    const parsed = new URL(apiUrl)
    return parsed.origin
  } catch {
    return ''
  }
}

function mediaBaseUrl(): string {
  return MEDIA_BASE_URL.replace(/\/+$/, '')
}

function currentOrigin(): string | null {
  if (typeof window === 'undefined') return null
  return window.location.origin
}

function isAbsoluteUrl(path: string): boolean {
  return (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:') ||
    path.startsWith('data:') ||
    path.startsWith('//')
  )
}

function mediaPathFromUrl(path: string): string | null {
  const trimmed = path.trim()
  if (trimmed.startsWith('/stream') || trimmed.startsWith('/uploads')) return trimmed
  if (!(trimmed.startsWith('http://') || trimmed.startsWith('https://'))) return null

  try {
    const parsed = new URL(trimmed, currentOrigin() ?? mediaBaseUrl())
    const isMediaPath =
      parsed.pathname.startsWith('/stream') || parsed.pathname.startsWith('/uploads')
    if (!isMediaPath) return null
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return null
  }
}

export function bumpMediaBuster() {
  mediaBuster = Date.now()
  return mediaBuster
}

export function getMediaBuster() {
  return mediaBuster
}

export function mediaUrl(path?: string | null): string {
  if (!path) return ''

  const baseUrl = mediaBaseUrl()
  const mediaPath = mediaPathFromUrl(path)
  const url =
    mediaPath && baseUrl
      ? `${baseUrl}/${mediaPath.replace(/^\/+/, '')}`
      : isAbsoluteUrl(path)
        ? path
        : `${baseUrl}/${path.replace(/^\/+/, '')}`

  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}t=${mediaBuster}`
}
