/**
 * BFF API Client
 *
 * Axios-based HTTP client for the HomSwag BFF API. Handles:
 * - Base URL configuration from environment variables
 * - Default X-Client-Type header
 * - JWT Bearer token injection via request interceptor
 * - Proactive token refresh (60-second pre-expiry window)
 * - 401 response handling with one retry after token refresh
 * - Request queuing during token refresh to prevent duplicate refreshes
 * - ApiError for non-2xx responses and success:false payloads
 */

import { Capacitor, CapacitorHttp } from '@capacitor/core'
import type {
  AxiosAdapter,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import axios from 'axios'
import { ENV } from '@/shared/lib/env'
import { STORAGE_KEYS, Storage_Service } from '@/shared/lib/storage'
import { useAuthStore } from '../stores'

// ---------------------------------------------------------------------------
// ApiError
// ---------------------------------------------------------------------------

/**
 * Typed error thrown for all non-2xx responses and `success: false` payloads.
 */
export class ApiError extends Error {
  status: number
  data?: unknown

  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
    // Restore prototype chain (required when extending built-ins in TypeScript)
    Object.setPrototypeOf(this, ApiError.prototype)
  }
}

// ---------------------------------------------------------------------------
// JWT helpers (no external library)
// ---------------------------------------------------------------------------

/**
 * Decode the `exp` claim from a JWT without verifying the signature.
 * Returns the expiry as a Unix timestamp in seconds, or `null` if the token
 * is malformed or missing the claim.
 */
function getJwtExp(token: string): number | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    // Base64url → Base64 → JSON
    const payload = parts[1]
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
    const decoded = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
    const json = JSON.parse(decoded)

    return typeof json.exp === 'number' ? json.exp : null
  } catch {
    return null
  }
}

/**
 * Returns `true` if the token is expired or will expire within 60 seconds.
 */
function isTokenExpiredOrExpiringSoon(token: string): boolean {
  const exp = getJwtExp(token)
  if (exp === null) return true // treat undecodable tokens as expired
  return exp - Date.now() / 1000 < 60
}

// ---------------------------------------------------------------------------
// Request queue (for concurrent requests during a refresh cycle)
// ---------------------------------------------------------------------------

type QueueResolver = (token: string) => void
type QueueRejecter = (error: unknown) => void

let isRefreshing = false
let logoutInProgress = false
const pendingQueue: Array<{ resolve: QueueResolver; reject: QueueRejecter }> = []

const PUBLIC_AUTH_PATHS = ['/auth/otp/request', '/auth/otp/verify']

function isPublicAuthPath(url: string | undefined): boolean {
  if (!url) return false
  return PUBLIC_AUTH_PATHS.some(path => url.includes(path))
}

function enqueueRequest(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    pendingQueue.push({ resolve, reject })
  })
}

function drainQueue(newToken: string): void {
  pendingQueue.forEach(({ resolve }) => {
    resolve(newToken)
  })
  pendingQueue.length = 0
}

function rejectQueue(error: unknown): void {
  pendingQueue.forEach(({ reject }) => {
    reject(error)
  })
  pendingQueue.length = 0
}

// ---------------------------------------------------------------------------
// Perform a token refresh (shared by both interceptors)
// ---------------------------------------------------------------------------

async function performRefresh(instance: AxiosInstance): Promise<string> {
  const storedRefreshToken = await Storage_Service.getString(STORAGE_KEYS.refreshToken)
  if (!storedRefreshToken) {
    throw new ApiError(401, 'No refresh token available')
  }

  // The BFF wraps the token pair in a `data` envelope:
  // { success, message, data: { accessToken, refreshToken } }
  const response = await instance.post<{
    success?: boolean
    message?: string
    data?: {
      accessToken: string
      refreshToken: string
    }
  }>('/auth/refresh', { refresh_token: storedRefreshToken })

  if (response.data?.success === false || !response.data?.data) {
    throw new ApiError(
      401,
      typeof response.data?.message === 'string'
        ? response.data.message
        : 'Failed to refresh session'
    )
  }

  const { accessToken, refreshToken } = response.data.data

  if (!accessToken || !refreshToken) {
    throw new ApiError(401, 'Invalid refresh response')
  }

  await Storage_Service.setString(STORAGE_KEYS.accessToken, accessToken)
  await Storage_Service.setString(STORAGE_KEYS.refreshToken, refreshToken)

  try {
    const authStore = useAuthStore()
    authStore.accessToken = accessToken
    authStore.refreshToken = refreshToken
  } catch {
    // ignore cases where auth store isn't available yet
  }

  return accessToken
}

async function logoutAndRedirect(): Promise<void> {
  if (logoutInProgress) {
    return
  }
  logoutInProgress = true

  try {
    const authStore = useAuthStore()
    await authStore.logout()
  } catch {
    // Ignore logout errors here.
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('homswag:logout'))
    window.location.href = '/login'
  }
}

// ---------------------------------------------------------------------------
// Custom Axios adapter — CapacitorHttp.request() (native only)
// ---------------------------------------------------------------------------
//
// Axios v1.7+ passes a `Request` object to `window.fetch` in its built-in
// fetch adapter. CapacitorHttp's global fetch patch only handles the
// (url: string, init: object) overload, so it fails silently (status 0).
// Calling CapacitorHttp.request() directly bypasses the patch entirely and
// is the officially recommended approach for Capacitor + Axios.

const capacitorHttpAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  // Build the full absolute URL — Axios keeps baseURL and path separate in config
  const base = (config.baseURL ?? '').replace(/\/$/, '')
  const path = (config.url ?? '').replace(/^([^/])/, '/$1')
  let url = base + path
  // Append serialised query params if present
  if (config.params) {
    const params = config.params as Record<string, unknown>
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return
      if (Array.isArray(value)) {
        value.forEach(item => {
          qs.append(key, String(item))
        })
      } else {
        qs.append(key, String(value))
      }
    })
    const queryString = qs.toString()
    if (queryString) url += (url.includes('?') ? '&' : '?') + queryString
  }
  const method = (config.method ?? 'GET').toUpperCase()

  // Flatten AxiosHeaders → plain Record<string, string>
  const headers: Record<string, string> = {}
  if (config.headers) {
    for (const [key, value] of Object.entries(config.headers)) {
      if (typeof value === 'string' || typeof value === 'number') {
        headers[key] = String(value)
      }
    }
  }

  // Axios serialises the body to a JSON string via transformRequest.
  // CapacitorHttp expects an object for JSON payloads — parse it back.
  let data: unknown = config.data
  if (typeof data === 'string' && headers['Content-Type']?.includes('application/json')) {
    try {
      data = JSON.parse(data)
    } catch {
      /* leave as-is */
    }
  }

  let nativeResponse: Awaited<ReturnType<typeof CapacitorHttp.request>>
  try {
    nativeResponse = await CapacitorHttp.request({ url, method, headers, data })
  } catch (e) {
    const err = Object.assign(new Error((e as Error)?.message ?? 'Network Error'), {
      code: 'ERR_NETWORK',
      config,
      isAxiosError: true,
    })
    return Promise.reject(err)
  }

  const response: AxiosResponse = {
    data: nativeResponse.data,
    status: nativeResponse.status,
    statusText: String(nativeResponse.status),
    headers: nativeResponse.headers ?? {},
    config,
    request: {},
  }

  // Mirror Axios's settle() logic: resolve if validateStatus passes, else reject
  const { validateStatus } = config
  if (!validateStatus || validateStatus(nativeResponse.status)) {
    return response
  }
  return Promise.reject(
    Object.assign(new Error(`Request failed with status code ${nativeResponse.status}`), {
      code: 'ERR_BAD_RESPONSE',
      config,
      response,
      isAxiosError: true,
    })
  )
}

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

// In dev mode (Vite live-reload) use an absolute URL from window.location.origin
// so CapacitorHttp routes requests to the Vite dev server (which proxies /api
// to the BFF). In production the full BFF URL is embedded at build time.
const prodUrl = ENV.VITE_BFF_API_URL
if (!ENV.DEV && (!prodUrl || !prodUrl.startsWith('http'))) {
  throw new Error(
    `[api] VITE_BFF_API_URL is missing or not an absolute URL ("${prodUrl}"). ` +
      'Build with --mode prod or set a correct absolute URL in .env.prod.'
  )
}
const baseURL = ENV.DEV
  ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api`
  : prodUrl

const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 15_000,
  headers: {
    'X-Client-Type': 'field',
  },
  // On native, use the direct CapacitorHttp adapter for JSON/plain requests.
  // For multipart (FormData), fall back to the default adapter (XHR/Fetch)
  // because CapacitorHttp.request does not support FormData objects.
  adapter: config => {
    if (Capacitor.isNativePlatform() && !(config.data instanceof FormData)) {
      return capacitorHttpAdapter(config)
    }
    // Use Axios's default adapter logic
    const defaultAdapter = axios.getAdapter(axios.defaults.adapter)
    return defaultAdapter(config)
  },
})

// ---------------------------------------------------------------------------
// Dev-only API logger — request + response/error
// ---------------------------------------------------------------------------

if (import.meta.env.DEV) {
  // Request logger
  apiClient.interceptors.request.use(config => {
    const method = (config.method ?? 'GET').toUpperCase()
    const url = `${config.baseURL ?? ''}${config.url ?? ''}`
    console.debug(`[API ▶] ${method} ${url}`)
    if (config.params && Object.keys(config.params).length)
      console.debug('[API ▶] params:', config.params)
    if (config.data) console.debug('[API ▶] body:', config.data)
    ;(config as unknown as Record<string, unknown>).__t = Date.now()
    return config
  })

  // Response logger
  apiClient.interceptors.response.use(
    response => {
      const method = (response.config.method ?? 'GET').toUpperCase()
      const ms =
        Date.now() -
        (((response.config as unknown as Record<string, unknown>).__t as number) ?? Date.now())
      console.debug(
        `[API ✅] ${method} ${response.config.baseURL ?? ''}${response.config.url ?? ''} — ${response.status} (${ms}ms)`
      )
      console.debug('[API ✅] response:', response.data)
      return response
    },
    error => {
      const config = error.config ?? {}
      const method = (config.method ?? 'GET').toUpperCase()
      const url = `${config.baseURL ?? ''}${config.url ?? ''}`
      const status = error.response?.status ?? 0
      const ms =
        Date.now() - (((config as unknown as Record<string, unknown>).__t as number) ?? Date.now())
      console.error(`[API ❌] ${method} ${url} — ${status} (${ms}ms)`)
      if (error.response?.data) console.error('[API ❌] error response:', error.response.data)
      else console.error('[API ❌] error:', error.message)
      return Promise.reject(error)
    }
  )
}

// ---------------------------------------------------------------------------
// Request interceptor — attach Bearer token + proactive refresh
// ---------------------------------------------------------------------------

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    // Skip auth header injection for public auth endpoints and refresh itself.
    if (isPublicAuthPath(config.url) || config.url?.includes('/auth/refresh')) {
      return config
    }

    if (config.headers.get('Authorization')) {
      return config
    }

    const accessToken = await Storage_Service.getString(STORAGE_KEYS.accessToken)

    if (accessToken) {
      if (isTokenExpiredOrExpiringSoon(accessToken)) {
        // Proactive refresh before sending the request
        if (!isRefreshing) {
          isRefreshing = true
          try {
            const newToken = await performRefresh(apiClient)
            isRefreshing = false
            drainQueue(newToken)
            config.headers.set('Authorization', `Bearer ${newToken}`)
          } catch (err) {
            isRefreshing = false
            rejectQueue(err)
            const apiErr = err instanceof Error ? err : new Error('Token refresh failed')
            const apiStatus = apiErr instanceof ApiError ? apiErr.status : 0
            if (apiStatus === 401 || apiStatus === 400 || apiStatus === 403) {
              await logoutAndRedirect()
            }
            throw err
          }
        } else {
          // Another refresh is already in progress — wait for it
          const newToken = await enqueueRequest()
          config.headers.set('Authorization', `Bearer ${newToken}`)
        }
      } else {
        config.headers.set('Authorization', `Bearer ${accessToken}`)
      }
    }

    return config
  },
  error => Promise.reject(error)
)

// ---------------------------------------------------------------------------
// Response interceptor — ApiError for non-2xx / success:false
// ---------------------------------------------------------------------------

apiClient.interceptors.response.use(
  response => {
    const requestUrl = String(response.config?.url ?? '')

    // Allow refresh endpoint to return `{ success: false }` to be handled by callers
    // so we can force logout on broken refresh flows.
    if (requestUrl.includes('/auth/refresh')) {
      return response
    }

    // Treat `success: false` in the response body as an error
    const data = response.data as Record<string, unknown> | null
    if (data && typeof data === 'object' && data.success === false) {
      const message = typeof data.message === 'string' ? data.message : 'Request failed'
      throw new ApiError(response.status, message, data)
    }
    return response
  },
  async error => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }
    const requestUrl = String(originalRequest.url ?? '')

    if (isPublicAuthPath(requestUrl)) {
      if (error.response) {
        const data = error.response.data as Record<string, unknown> | null
        const message =
          (data && typeof data.message === 'string' ? data.message : null) ??
          error.message ??
          'Authentication request failed'
        return Promise.reject(new ApiError(error.response.status as number, message, data))
      }
      return Promise.reject(new ApiError(0, error.message ?? 'Network error'))
    }

    // If the refresh request itself fails, handle it here.
    if (requestUrl.includes('/auth/refresh')) {
      isRefreshing = false
      const status = error.response?.status ?? 0
      const apiErr = new ApiError(status, error.message ?? 'Network error during refresh')
      rejectQueue(apiErr)

      if (status === 401 || status === 400 || status === 403) {
        await logoutAndRedirect()
        return Promise.reject(new ApiError(status, 'Session expired. Please log in again.'))
      }
      return Promise.reject(apiErr)
    }

    // Handle 401 — attempt one token refresh then retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      if (isRefreshing) {
        // A refresh is already in progress — queue this request
        try {
          const newToken = await enqueueRequest()
          if (originalRequest.headers) {
            const headers = originalRequest.headers as Record<string, string>
            headers.Authorization = `Bearer ${newToken}`
          }
          return apiClient(originalRequest)
        } catch (queueError) {
          return Promise.reject(queueError)
        }
      }

      isRefreshing = true
      try {
        const newToken = await performRefresh(apiClient)
        isRefreshing = false
        drainQueue(newToken)

        if (originalRequest.headers) {
          const headers = originalRequest.headers as Record<string, string>
          headers.Authorization = `Bearer ${newToken}`
        }
        return apiClient(originalRequest)
      } catch (err) {
        isRefreshing = false
        rejectQueue(err)
        return Promise.reject(err)
      }
    }

    // All other errors — wrap in ApiError
    if (error.response) {
      const data = error.response.data as Record<string, unknown> | null
      const message =
        (data && typeof data.message === 'string' ? data.message : null) ??
        error.message ??
        'An unexpected error occurred'
      return Promise.reject(new ApiError(error.response.status as number, message, data))
    }

    // Network / timeout errors
    return Promise.reject(new ApiError(0, error.message ?? 'Network error'))
  }
)

export default apiClient
