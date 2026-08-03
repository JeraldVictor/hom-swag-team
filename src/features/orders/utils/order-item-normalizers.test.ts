import { describe, expect, it } from 'vitest'
import { getPackageServiceDisplayQuantity, getPackageServices } from './order-item-normalizers'

describe('getPackageServices', () => {
  it('defaults legacy quantities and sorts package services by display order', () => {
    expect(
      getPackageServices({
        selected_package_services: [
          { product_id: 'second', title: 'Second', quantity: 3, display_order: 20 },
          { product_id: 'first', title: 'First', display_order: 10 },
        ],
      })
    ).toEqual([
      expect.objectContaining({
        product_id: 'first',
        title: 'First',
        quantity: 1,
        display_order: 10,
      }),
      expect.objectContaining({
        product_id: 'second',
        title: 'Second',
        quantity: 3,
        display_order: 20,
      }),
    ])
  })
})

describe('getPackageServiceDisplayQuantity', () => {
  it('multiplies each child service quantity by the package quantity', () => {
    expect(getPackageServiceDisplayQuantity({ quantity: 2 }, { quantity: 1 })).toBe(2)
    expect(getPackageServiceDisplayQuantity({ quantity: 3 }, { quantity: 1 })).toBe(3)
    expect(getPackageServiceDisplayQuantity({ quantity: 2 }, { quantity: 2 })).toBe(4)
  })

  it('keeps legacy missing or invalid quantities backward compatible', () => {
    expect(getPackageServiceDisplayQuantity({}, {})).toBe(1)
    expect(getPackageServiceDisplayQuantity({ quantity: 0 }, { quantity: 0 })).toBe(1)
  })
})
