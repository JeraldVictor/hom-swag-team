import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api', () => ({ getOrders: vi.fn() }))

import { useOrders } from '@/features/orders/composables/useOrders'
import { getOrders } from '@/shared/api'

const getOrdersMock = vi.mocked(getOrders)

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(next => {
    resolve = next
  })
  return { promise, resolve }
}

describe('useOrders realtime refresh behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requests confirmed orders by default', async () => {
    getOrdersMock.mockResolvedValueOnce({ data: [], page: 1, pages: 1, total: 0 } as never)
    const orders = useOrders()

    await orders.fetchOrders()

    expect(getOrdersMock).toHaveBeenCalledWith(1, 20, 'today', 'confirmed')
  })

  it('does not let an older response overwrite a realtime refresh', async () => {
    const older = deferred<{ data: Array<{ id: string; status: string }> }>()
    const newer = deferred<{ data: Array<{ id: string; status: string }> }>()
    getOrdersMock
      .mockReturnValueOnce(older.promise as never)
      .mockReturnValueOnce(newer.promise as never)
    const orders = useOrders()

    const olderRequest = orders.fetchOrders()
    const realtimeRefresh = orders.refresh()

    newer.resolve({ data: [{ id: 'confirmed-order', status: 'confirmed' }] })
    await realtimeRefresh
    older.resolve({ data: [{ id: 'stale-draft', status: 'assigned_draft' }] })
    await olderRequest

    expect(orders.orders.value.map(order => order.id)).toEqual(['confirmed-order'])
  })
})
