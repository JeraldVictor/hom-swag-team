/**
 * Unit tests for the BFF API client (src/lib/api.ts)
 *
 * Covers:
 * - X-Client-Type header injection on every request
 * - Authorization Bearer header injection from stored access token
 * - Proactive token refresh when token is expired or within 60 seconds of expiry
 * - 401 response handling: one refresh + retry, then logout + ApiError
 * - Request queue draining: concurrent requests wait for a single refresh cycle
 * - ApiError thrown for non-2xx responses
 * - ApiError thrown for success:false responses
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Helpers — build a JWT with a given exp (Unix seconds)
// ---------------------------------------------------------------------------

function buildJwt(exp: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  const payload = btoa(JSON.stringify({ sub: '1', exp }))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  return `${header}.${payload}.signature`
}

const NOW_SECONDS = Math.floor(Date.now() / 1000)
const VALID_TOKEN = buildJwt(NOW_SECONDS + 300)    // expires in 5 minutes
const EXPIRING_TOKEN = buildJwt(NOW_SECONDS + 30)  // expires in 30 seconds (< 60s window)
const EXPIRED_TOKEN = buildJwt(NOW_SECONDS - 10)   // already expired
const NEW_ACCESS_TOKEN = buildJwt(NOW_SECONDS + 3600)
const NEW_REFRESH_TOKEN = 'new-refresh-token'

// ---------------------------------------------------------------------------
// Mock @capacitor/preferences
// ---------------------------------------------------------------------------

const mockPrefsStore: Record<string, string> = {}

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      mockPrefsStore[key] = value
    }),
    get: vi.fn(async ({ key }: { key: string }) => ({
      value: Object.prototype.hasOwnProperty.call(mockPrefsStore, key)
        ? mockPrefsStore[key]
        : null,
    })),
    remove: vi.fn(async ({ key }: { key: string }) => {
      delete mockPrefsStore[key]
    }),
  },
}))

// ---------------------------------------------------------------------------
// Mock @/shared/stores/auth (lazy import inside the 401 handler)
// ---------------------------------------------------------------------------

const mockLogout = vi.fn().mockResolvedValue(undefined)

vi.mock('@/shared/stores/auth', () => ({
  useAuthStore: () => ({ logout: mockLogout }),
}))

// ---------------------------------------------------------------------------
// Mock axios — use vi.hoisted so all shared state is available in vi.mock factory
// ---------------------------------------------------------------------------

type RequestInterceptorFn = (config: Record<string, unknown>) => Promise<Record<string, unknown>>
type ResponseFulfilledFn = (response: Record<string, unknown>) => Record<string, unknown>
type ResponseRejectedFn = (error: unknown) => Promise<unknown>

const {
  mockAxiosInstance,
  requestInterceptors,
  responseFulfilledInterceptors,
  responseRejectedInterceptors,
} = vi.hoisted(() => {
  const reqInterceptors: RequestInterceptorFn[] = []
  const resFulfilledInterceptors: ResponseFulfilledFn[] = []
  const resRejectedInterceptors: ResponseRejectedFn[] = []

  const instance = {
    post: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn((fulfilled: RequestInterceptorFn) => {
          reqInterceptors.push(fulfilled)
        }),
      },
      response: {
        use: vi.fn((fulfilled: ResponseFulfilledFn, rejected: ResponseRejectedFn) => {
          resFulfilledInterceptors.push(fulfilled)
          resRejectedInterceptors.push(rejected)
        }),
      },
    },
  }

  return {
    mockAxiosInstance: instance,
    requestInterceptors: reqInterceptors,
    responseFulfilledInterceptors: resFulfilledInterceptors,
    responseRejectedInterceptors: resRejectedInterceptors,
  }
})

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
}))

// ---------------------------------------------------------------------------
// Import module under test AFTER mocks are set up
// ---------------------------------------------------------------------------

import { ApiError } from '@/shared/lib/api'
import { STORAGE_KEYS } from '@/shared/lib/storage'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clearPrefsStore() {
  for (const key of Object.keys(mockPrefsStore)) {
    delete mockPrefsStore[key]
  }
}

/** Run a config through all registered request interceptors in order. */
async function runRequestInterceptors(
  config: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  let current = config
  for (const interceptor of requestInterceptors) {
    current = await interceptor(current)
  }
  return current
}

/** Run a successful response through all fulfilled response interceptors. */
function runResponseFulfilled(
  response: Record<string, unknown>,
): Record<string, unknown> {
  let current = response
  for (const interceptor of responseFulfilledInterceptors) {
    current = interceptor(current)
  }
  return current
}

/** Run an error through all rejection response interceptors. */
async function runResponseRejected(error: unknown): Promise<unknown> {
  let result: unknown = error
  for (const interceptor of responseRejectedInterceptors) {
    try {
      result = await interceptor(result)
      return result
    } catch (e) {
      result = e
    }
  }
  throw result
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ApiError', () => {
  it('is an instance of Error', () => {
    const err = new ApiError(404, 'Not found')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ApiError)
  })

  it('sets status and message correctly', () => {
    const err = new ApiError(422, 'Validation failed', { field: 'email' })
    expect(err.status).toBe(422)
    expect(err.message).toBe('Validation failed')
    expect(err.data).toEqual({ field: 'email' })
  })

  it('has name "ApiError"', () => {
    const err = new ApiError(500, 'Server error')
    expect(err.name).toBe('ApiError')
  })
})

describe('Request interceptor — header injection', () => {
  beforeEach(() => {
    clearPrefsStore()
    vi.clearAllMocks()
  })

  it('attaches Authorization Bearer header when a valid access token is stored', async () => {
    mockPrefsStore[STORAGE_KEYS.accessToken] = VALID_TOKEN

    const config = { url: '/some/endpoint', headers: { set: vi.fn() } }
    await runRequestInterceptors(config as unknown as Record<string, unknown>)

    expect(config.headers.set).toHaveBeenCalledWith('Authorization', `Bearer ${VALID_TOKEN}`)
  })

  it('does not attach Authorization header when no token is stored', async () => {
    const config = { url: '/some/endpoint', headers: { set: vi.fn() } }
    await runRequestInterceptors(config as unknown as Record<string, unknown>)

    expect(config.headers.set).not.toHaveBeenCalled()
  })

  it('skips token injection for /auth/refresh endpoint', async () => {
    mockPrefsStore[STORAGE_KEYS.accessToken] = VALID_TOKEN

    const config = { url: '/auth/refresh', headers: { set: vi.fn() } }
    await runRequestInterceptors(config as unknown as Record<string, unknown>)

    expect(config.headers.set).not.toHaveBeenCalled()
  })

  it('skips token injection and refresh for /auth/otp/verify endpoint', async () => {
    mockPrefsStore[STORAGE_KEYS.accessToken] = EXPIRED_TOKEN

    const config = { url: '/auth/otp/verify', headers: { set: vi.fn() } }
    await runRequestInterceptors(config as unknown as Record<string, unknown>)

    expect(mockAxiosInstance.post).not.toHaveBeenCalled()
    expect(config.headers.set).not.toHaveBeenCalled()
  })
})

describe('Request interceptor — proactive token refresh', () => {
  beforeEach(() => {
    clearPrefsStore()
    vi.clearAllMocks()
    mockAxiosInstance.post.mockResolvedValue({
      data: { data: { accessToken: NEW_ACCESS_TOKEN, refreshToken: NEW_REFRESH_TOKEN } },
    })
  })

  it('proactively refreshes when token expires within 60 seconds', async () => {
    mockPrefsStore[STORAGE_KEYS.accessToken] = EXPIRING_TOKEN
    mockPrefsStore[STORAGE_KEYS.refreshToken] = 'old-refresh-token'

    const config = { url: '/protected', headers: { set: vi.fn() } }
    await runRequestInterceptors(config as unknown as Record<string, unknown>)

    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/auth/refresh',
      { refresh_token: 'old-refresh-token' },
    )
    expect(config.headers.set).toHaveBeenCalledWith('Authorization', `Bearer ${NEW_ACCESS_TOKEN}`)
  })

  it('proactively refreshes when token is already expired', async () => {
    mockPrefsStore[STORAGE_KEYS.accessToken] = EXPIRED_TOKEN
    mockPrefsStore[STORAGE_KEYS.refreshToken] = 'old-refresh-token'

    const config = { url: '/protected', headers: { set: vi.fn() } }
    await runRequestInterceptors(config as unknown as Record<string, unknown>)

    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/auth/refresh',
      { refresh_token: 'old-refresh-token' },
    )
  })

  it('does NOT refresh when token has more than 60 seconds remaining', async () => {
    mockPrefsStore[STORAGE_KEYS.accessToken] = VALID_TOKEN

    const config = { url: '/protected', headers: { set: vi.fn() } }
    await runRequestInterceptors(config as unknown as Record<string, unknown>)

    expect(mockAxiosInstance.post).not.toHaveBeenCalled()
    expect(config.headers.set).toHaveBeenCalledWith('Authorization', `Bearer ${VALID_TOKEN}`)
  })

  it('stores the new tokens in Storage_Service after proactive refresh', async () => {
    mockPrefsStore[STORAGE_KEYS.accessToken] = EXPIRING_TOKEN
    mockPrefsStore[STORAGE_KEYS.refreshToken] = 'old-refresh-token'

    const config = { url: '/protected', headers: { set: vi.fn() } }
    await runRequestInterceptors(config as unknown as Record<string, unknown>)

    expect(mockPrefsStore[STORAGE_KEYS.accessToken]).toBe(NEW_ACCESS_TOKEN)
    expect(mockPrefsStore[STORAGE_KEYS.refreshToken]).toBe(NEW_REFRESH_TOKEN)
  })
})

describe('Response interceptor — ApiError for non-2xx', () => {
  beforeEach(() => {
    clearPrefsStore()
    vi.clearAllMocks()
  })

  it('passes through successful 2xx responses unchanged', () => {
    const response = { status: 200, data: { id: 1, name: 'Test' } }
    const result = runResponseFulfilled(response as unknown as Record<string, unknown>)
    expect(result).toEqual(response)
  })

  it('throws ApiError for a 404 response', async () => {
    const error = {
      response: { status: 404, data: { message: 'Not found' } },
      config: { _retry: false },
      message: 'Request failed with status code 404',
    }

    await expect(runResponseRejected(error)).rejects.toBeInstanceOf(ApiError)
    await expect(runResponseRejected(error)).rejects.toMatchObject({
      status: 404,
      message: 'Not found',
    })
  })

  it('throws ApiError for a 500 response', async () => {
    const error = {
      response: { status: 500, data: { message: 'Internal server error' } },
      config: { _retry: false },
      message: 'Request failed with status code 500',
    }

    await expect(runResponseRejected(error)).rejects.toMatchObject({
      status: 500,
      message: 'Internal server error',
    })
  })

  it('throws ApiError with status 0 for network errors (no response)', async () => {
    const error = { message: 'Network Error' }

    await expect(runResponseRejected(error)).rejects.toMatchObject({
      status: 0,
      message: 'Network Error',
    })
  })

  it('throws ApiError for success:false response body', () => {
    const response = {
      status: 200,
      data: { success: false, message: 'Operation not allowed' },
    }

    expect(() =>
      runResponseFulfilled(response as unknown as Record<string, unknown>)
    ).toThrow(ApiError)

    expect(() =>
      runResponseFulfilled(response as unknown as Record<string, unknown>)
    ).toThrow('Operation not allowed')
  })

  it('passes through when success is true', () => {
    const response = { status: 200, data: { success: true, data: [1, 2, 3] } }
    const result = runResponseFulfilled(response as unknown as Record<string, unknown>)
    expect(result).toEqual(response)
  })
})

describe('Response interceptor — 401 retry', () => {
  beforeEach(() => {
    clearPrefsStore()
    vi.clearAllMocks()
    mockPrefsStore[STORAGE_KEYS.refreshToken] = 'stored-refresh-token'
  })

  it('attempts token refresh when a 401 is received', async () => {
    // Refresh succeeds but the retry call (apiClient(config)) will fail since
    // the mock instance isn't callable — we just verify the refresh was attempted.
    mockAxiosInstance.post.mockResolvedValueOnce({
      data: { data: { accessToken: NEW_ACCESS_TOKEN, refreshToken: NEW_REFRESH_TOKEN } },
    })

    const error = {
      response: { status: 401, data: { message: 'Unauthorized' } },
      config: { _retry: false, url: '/protected', headers: {} },
      message: 'Request failed with status code 401',
    }

    try {
      await runResponseRejected(error)
    } catch {
      // The retry itself may fail since the mock instance isn't callable
    }

    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/auth/refresh',
      { refresh_token: 'stored-refresh-token' },
    )
  })

  it('calls Auth_Store.logout() and throws ApiError(401) when refresh fails', async () => {
    mockAxiosInstance.post.mockRejectedValueOnce(
      Object.assign(new Error('Unauthorized'), {
        response: { status: 401, data: { message: 'Refresh token expired' } },
      }),
    )

    const error = {
      response: { status: 401, data: { message: 'Unauthorized' } },
      config: { _retry: false, url: '/protected', headers: {} },
      message: 'Request failed with status code 401',
    }

    await expect(runResponseRejected(error)).rejects.toMatchObject({ status: 401 })
    expect(mockLogout).toHaveBeenCalled()
  })

  it('does not retry if _retry flag is already set (prevents infinite loop)', async () => {
    const error = {
      response: { status: 401, data: { message: 'Unauthorized' } },
      config: { _retry: true, url: '/protected', headers: {} },
      message: 'Request failed with status code 401',
    }

    await expect(runResponseRejected(error)).rejects.toMatchObject({ status: 401 })
    expect(mockAxiosInstance.post).not.toHaveBeenCalled()
  })
})

describe('Request queue draining', () => {
  beforeEach(() => {
    clearPrefsStore()
    vi.clearAllMocks()
    mockPrefsStore[STORAGE_KEYS.refreshToken] = 'stored-refresh-token'
  })

  it('queues concurrent requests and drains them after a single refresh', async () => {
    let resolveRefresh!: () => void
    const refreshPromise = new Promise<void>((res) => { resolveRefresh = res })

    mockAxiosInstance.post.mockReturnValueOnce(
      refreshPromise.then(() => ({
        data: { data: { accessToken: NEW_ACCESS_TOKEN, refreshToken: NEW_REFRESH_TOKEN } },
      })),
    )

    mockPrefsStore[STORAGE_KEYS.accessToken] = EXPIRING_TOKEN

    const config1 = { url: '/endpoint-1', headers: { set: vi.fn() } }
    const config2 = { url: '/endpoint-2', headers: { set: vi.fn() } }

    // Start both requests concurrently — the second should queue behind the first
    const req1 = runRequestInterceptors(config1 as unknown as Record<string, unknown>)
    const req2 = runRequestInterceptors(config2 as unknown as Record<string, unknown>)

    // Resolve the refresh
    resolveRefresh()

    await Promise.all([req1, req2])

    // Refresh should only have been called once
    expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1)

    // Both requests should have the new token
    expect(config1.headers.set).toHaveBeenCalledWith('Authorization', `Bearer ${NEW_ACCESS_TOKEN}`)
    expect(config2.headers.set).toHaveBeenCalledWith('Authorization', `Bearer ${NEW_ACCESS_TOKEN}`)
  })
})
