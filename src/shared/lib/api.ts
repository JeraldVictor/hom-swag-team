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

import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'
import { Storage_Service, STORAGE_KEYS } from '@/shared/lib/storage'

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
const pendingQueue: Array<{ resolve: QueueResolver; reject: QueueRejecter }> = []

function enqueueRequest(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    pendingQueue.push({ resolve, reject })
  })
}

function drainQueue(newToken: string): void {
  pendingQueue.forEach(({ resolve }) => resolve(newToken))
  pendingQueue.length = 0
}

function rejectQueue(error: unknown): void {
  pendingQueue.forEach(({ reject }) => reject(error))
  pendingQueue.length = 0
}

// ---------------------------------------------------------------------------
// Perform a token refresh (shared by both interceptors)
// ---------------------------------------------------------------------------

async function performRefresh(instance: AxiosInstance): Promise<string> {
  const refreshToken = await Storage_Service.getString(STORAGE_KEYS.refreshToken)
  if (!refreshToken) {
    throw new ApiError(401, 'No refresh token available')
  }

  const response = await instance.post<{ access_token: string; refresh_token: string }>(
    '/auth/refresh',
    { refresh_token: refreshToken },
  )

  const { access_token, refresh_token } = response.data
  await Storage_Service.setString(STORAGE_KEYS.accessToken, access_token)
  await Storage_Service.setString(STORAGE_KEYS.refreshToken, refresh_token)

  return access_token
}

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
  timeout: 15_000,
  headers: {
    'X-Client-Type': 'field',
  },
})

// ---------------------------------------------------------------------------
// Request interceptor — attach Bearer token + proactive refresh
// ---------------------------------------------------------------------------

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    // Skip auth header injection for the refresh endpoint itself to avoid loops
    if (config.url?.includes('/auth/refresh')) {
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
  (error) => Promise.reject(error),
)

// ---------------------------------------------------------------------------
// Response interceptor — ApiError for non-2xx / success:false
// ---------------------------------------------------------------------------

apiClient.interceptors.response.use(
  (response) => {
    // Treat `success: false` in the response body as an error
    const data = response.data as Record<string, unknown> | null
    if (data && typeof data === 'object' && data.success === false) {
      const message = typeof data.message === 'string' ? data.message : 'Request failed'
      throw new ApiError(response.status, message, data)
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    // Handle 401 — attempt one token refresh then retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      if (isRefreshing) {
        // A refresh is already in progress — queue this request
        try {
          const newToken = await enqueueRequest()
          if (originalRequest.headers) {
            (originalRequest.headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`
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
          (originalRequest.headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`
        }
        return apiClient(originalRequest)
      } catch {
        isRefreshing = false
        rejectQueue(new ApiError(401, 'Token refresh failed'))

        // Lazy import to avoid circular dependency
        const { useAuthStore } = await import('@/shared/stores/auth')
        const authStore = useAuthStore()
        await authStore.logout()

        return Promise.reject(new ApiError(401, 'Session expired. Please log in again.'))
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
  },
)

export default apiClient
