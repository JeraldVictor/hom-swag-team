import HomePage from '@/features/home/views/HomeView.vue'
import { describe, expect, test } from 'vitest'

describe('HomePage.vue', () => {
  test('renders home view', () => {
    expect(HomePage).toBeDefined()
  })
})
