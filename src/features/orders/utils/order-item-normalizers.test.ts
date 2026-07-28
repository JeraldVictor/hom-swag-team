import { describe, expect, it } from 'vitest'
import { getPackageServices } from './order-item-normalizers'

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
