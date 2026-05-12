import { ENV } from '@/shared/lib/env'

const MEDIA_BASE_URL = ENV.VITE_MEDIA_BASE_URL || 'http://alpha.homswag.com'

let mediaBuster = Date.now()

export function bumpMediaBuster() {
  mediaBuster = Date.now()
  return mediaBuster
}

export function getMediaBuster() {
  return mediaBuster
}

export function mediaUrl(path?: string | null): string {
  if (!path) return ''

  const hasAbsoluteUrl = /^https?:\/\//i.test(path)
  const url = hasAbsoluteUrl
    ? path
    : `${MEDIA_BASE_URL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`

  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}t=${mediaBuster}`
}
