import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api/trips.service', () => ({
  getTrip: vi.fn(),
  updateTripStatus: vi.fn(),
}))

import { useTripDetail } from '@/features/trips/composables/useTripDetail'
import { getTrip, updateTripStatus } from '@/shared/api/trips.service'
import { TRIP_STATUS } from '@/shared/models/trip.model'

const getTripMock = vi.mocked(getTrip)
const updateTripStatusMock = vi.mocked(updateTripStatus)

describe('useTripDetail completed trip behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not allow a completed trip to transition to another status', async () => {
    getTripMock.mockResolvedValueOnce({
      id: 'completed-trip',
      status: TRIP_STATUS.COMPLETED,
    } as never)
    const tripDetail = useTripDetail()

    await tripDetail.fetchTrip('completed-trip')
    await tripDetail.advanceStatus(TRIP_STATUS.ATTENTION_NEEDED)

    expect(updateTripStatusMock).not.toHaveBeenCalled()
    expect(tripDetail.trip.value?.status).toBe(TRIP_STATUS.COMPLETED)
  })
})
