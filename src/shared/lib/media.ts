const MEDIA_BASE_URL =
  (import.meta.env.VITE_MEDIA_BASE_URL as string | undefined) ?? 'http://alpha.homswag.com'

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
