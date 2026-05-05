import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppButton from '@/components/ui/AppButton.vue'

// Stub Ionic components so jsdom doesn't need the full Ionic runtime
const globalStubs = {
  'ion-button': {
    template: `<button v-bind="$attrs" :class="$attrs.class"><slot /></button>`,
    props: ['color', 'fill', 'size', 'disabled'],
  },
}

describe('AppButton', () => {
  // -------------------------------------------------------------------------
  // Default rendering
  // -------------------------------------------------------------------------
  it('renders with default props', () => {
    const wrapper = mount(AppButton, {
      slots: { default: 'Click me' },
      global: { stubs: globalStubs },
    })
    expect(wrapper.text()).toBe('Click me')
  })

  // -------------------------------------------------------------------------
  // Variant → Ionic color mapping
  // -------------------------------------------------------------------------
  it.each([
    ['primary', 'primary', 'solid'],
    ['secondary', 'secondary', 'solid'],
    ['danger', 'danger', 'solid'],
    ['ghost', 'primary', 'clear'],
  ] as const)(
    'variant "%s" maps to color="%s" and fill="%s"',
    (variant, expectedColor, expectedFill) => {
      const wrapper = mount(AppButton, {
        props: { variant },
        global: { stubs: globalStubs },
      })
      const btn = wrapper.findComponent({ name: 'ion-button' })
      expect(btn.props('color')).toBe(expectedColor)
      expect(btn.props('fill')).toBe(expectedFill)
    }
  )

  // -------------------------------------------------------------------------
  // Size → Ionic size mapping
  // -------------------------------------------------------------------------
  it.each([
    ['sm', 'small'],
    ['md', 'default'],
    ['lg', 'large'],
  ] as const)('size "%s" maps to Ionic size "%s"', (size, expectedSize) => {
    const wrapper = mount(AppButton, {
      props: { size },
      global: { stubs: globalStubs },
    })
    const btn = wrapper.findComponent({ name: 'ion-button' })
    expect(btn.props('size')).toBe(expectedSize)
  })

  // -------------------------------------------------------------------------
  // Muted class — loading state
  // -------------------------------------------------------------------------
  it('applies app-btn--muted class when loading=true', () => {
    const wrapper = mount(AppButton, {
      props: { loading: true },
      global: { stubs: globalStubs },
    })
    const btn = wrapper.findComponent({ name: 'ion-button' })
    expect(btn.classes()).toContain('app-btn--muted')
  })

  // -------------------------------------------------------------------------
  // Muted class — disabled state
  // -------------------------------------------------------------------------
  it('applies app-btn--muted class when disabled=true', () => {
    const wrapper = mount(AppButton, {
      props: { disabled: true },
      global: { stubs: globalStubs },
    })
    const btn = wrapper.findComponent({ name: 'ion-button' })
    expect(btn.classes()).toContain('app-btn--muted')
  })

  // -------------------------------------------------------------------------
  // No muted class when neither loading nor disabled
  // -------------------------------------------------------------------------
  it('does NOT apply app-btn--muted when neither loading nor disabled', () => {
    const wrapper = mount(AppButton, {
      props: { loading: false, disabled: false },
      global: { stubs: globalStubs },
    })
    const btn = wrapper.findComponent({ name: 'ion-button' })
    expect(btn.classes()).not.toContain('app-btn--muted')
  })

  // -------------------------------------------------------------------------
  // Disabled prop forwarded to ion-button
  // -------------------------------------------------------------------------
  it('passes disabled=true to ion-button when disabled prop is set', () => {
    const wrapper = mount(AppButton, {
      props: { disabled: true },
      global: { stubs: globalStubs },
    })
    const btn = wrapper.findComponent({ name: 'ion-button' })
    expect(btn.props('disabled')).toBe(true)
  })

  it('passes disabled=true to ion-button when loading prop is set', () => {
    const wrapper = mount(AppButton, {
      props: { loading: true },
      global: { stubs: globalStubs },
    })
    const btn = wrapper.findComponent({ name: 'ion-button' })
    expect(btn.props('disabled')).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Click event
  // -------------------------------------------------------------------------
  it('emits click event when clicked', async () => {
    const wrapper = mount(AppButton, {
      global: { stubs: globalStubs },
    })
    await wrapper.findComponent({ name: 'ion-button' }).trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
