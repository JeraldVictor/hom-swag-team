import { describe, expect, it } from 'vitest'
import {
	calculateOrderEditDiscountEligibleSubtotal,
	calculateOrderEditEffectiveDiscountTotal,
	getOrderEditLineTotal,
	getOrderEditLineUnitPrice,
} from '@/features/orders/utils/order-edit-calculations'

describe('order edit calculations', () => {
	it('does not apply an existing 100% discount to beautician-added upgrades', () => {
		const items = [
			{ price: 649, quantity: 1, beautician_added: false },
			{ price: 994, quantity: 1, beautician_added: true },
		]

		expect(calculateOrderEditDiscountEligibleSubtotal(items)).toBe(649)
		expect(calculateOrderEditEffectiveDiscountTotal(1643, items)).toBe(649)
	})

	it('excludes beautician-added option quantities from discount eligibility', () => {
		const items = [
			{
				quantity: 1,
				selected_options: [
					{ price: 35, quantity: 1 },
					{ price: 35, quantity: 2, beautician_added: true },
				],
			},
		]

		expect(calculateOrderEditDiscountEligibleSubtotal(items)).toBe(35)
		expect(calculateOrderEditEffectiveDiscountTotal(105, items)).toBe(35)
	})

	it('excludes beautician-added package services from discount eligibility', () => {
		const items = [
			{
				type: 'package' as const,
				package_mode: 'choose_any' as const,
				quantity: 1,
				selected_package_items: [{ price: 35 }, { price: 45, beautician_added: true }],
			},
		]

		expect(getOrderEditLineTotal(items[0])).toBe(80)
		expect(calculateOrderEditDiscountEligibleSubtotal(items)).toBe(35)
		expect(calculateOrderEditEffectiveDiscountTotal(80, items)).toBe(35)
	})

	it('does not preserve any old discount when every cart line is beautician added', () => {
		const items = [
			{ price: 499, quantity: 1, beautician_added: true },
			{ price: 150, quantity: 2, beautician_added: true },
		]

		expect(calculateOrderEditDiscountEligibleSubtotal(items)).toBe(0)
		expect(calculateOrderEditEffectiveDiscountTotal(999, items)).toBe(0)
	})

	it('uses selected package service prices for limit and choose-any package totals', () => {
		const item = {
			type: 'package' as const,
			package_mode: 'choose_any' as const,
			price: 899,
			quantity: 1,
			selected_package_items: [{ price: 45 }, { price: 299 }, { price: 399 }],
		}

		expect(getOrderEditLineUnitPrice(item)).toBe(743)
		expect(getOrderEditLineTotal(item)).toBe(743)
		expect(calculateOrderEditDiscountEligibleSubtotal([item])).toBe(743)
	})

	it('clamps malformed discounts and negative money values to zero', () => {
		const items = [
			{
				price: -500,
				quantity: -2,
				selected_options: [{ price: Number.NaN, quantity: -1, beautician_added: true }],
				selected_package_items: [{ price: -45, beautician_added: true }],
			},
		]

		expect(getOrderEditLineTotal(items[0])).toBe(0)
		expect(calculateOrderEditDiscountEligibleSubtotal(items)).toBe(0)
		expect(calculateOrderEditEffectiveDiscountTotal(-100, items)).toBe(0)
	})
})
