import { describe, expect, it } from 'vitest'
import { ORDER_STATUS } from '@/shared/constants'
import { canUploadSetupPhotos } from './order-media-permissions'

describe('canUploadSetupPhotos', () => {
  it.each([
    ORDER_STATUS.REACHED_CUSTOMER_PLACE,
    ORDER_STATUS.STARTED,
  ])('allows repeated uploads while the order is %s', status => {
    expect(canUploadSetupPhotos(status, true, true)).toBe(true)
  })

  it.each([
    ORDER_STATUS.COMPLETED,
    ORDER_STATUS.CANCELLED,
    ORDER_STATUS.CANCELLED_AND_REFUNDED,
    ORDER_STATUS.ARRIVED_AND_CANCELLED,
  ])('blocks uploads once the order is %s', status => {
    expect(canUploadSetupPhotos(status, true, true)).toBe(false)
  })

  it('requires the arrival selfie and an editable order', () => {
    expect(canUploadSetupPhotos(ORDER_STATUS.STARTED, false, true)).toBe(false)
    expect(canUploadSetupPhotos(ORDER_STATUS.STARTED, true, false)).toBe(false)
  })
})
