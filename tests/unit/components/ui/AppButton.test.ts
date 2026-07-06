import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppButton from '@/shared/components/ui/AppButton.vue'

// Stub Ionic components so jsdom doesn't need the full Ionic runtime
const globalStubs = {
  'ion-button': {
    name: 'ion-button',
    template: `<button v-bind="$attrs" :class="$attrs.class"><slot /></button>`,
    props: ['color', 'fill', 'size', 'disabled', 'expand', 'href', 'target'],
  },
  Icon: true,
  'ion-spinner': true,
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
  ] as const)('size "%s" maps to responsive AppButton modifier class', (size, _expectedSize) => {
    const wrapper = mount(AppButton, {
      props: { size },
      global: { stubs: globalStubs },
    })
    const btn = wrapper.findComponent({ name: 'ion-button' })

    if (size === 'sm') {
      expect(btn.classes()).toContain('app-btn--sm')
    } else if (size === 'lg') {
      expect(btn.classes()).toContain('app-btn--lg')
    } else {
      expect(btn.classes()).not.toContain('app-btn--sm')
      expect(btn.classes()).not.toContain('app-btn--lg')
    }
  })

  // -------------------------------------------------------------------------
  // Muted class — loading state
  // -------------------------------------------------------------------------
  it('applies app-btn--loading class when loading=true', () => {
    const wrapper = mount(AppButton, {
      props: { loading: true },
      global: { stubs: globalStubs },
    })
    const btn = wrapper.findComponent({ name: 'ion-button' })
    expect(btn.classes()).toContain('app-btn--loading')
  })

  // -------------------------------------------------------------------------
  // Muted class — disabled state
  // -------------------------------------------------------------------------
  it('does NOT apply app-btn--loading class when only disabled=true', () => {
    const wrapper = mount(AppButton, {
      props: { disabled: true },
      global: { stubs: globalStubs },
    })
    const btn = wrapper.findComponent({ name: 'ion-button' })
    expect(btn.props('disabled')).toBe(true)
    expect(btn.classes()).not.toContain('app-btn--loading')
  })

  // -------------------------------------------------------------------------
  // No muted class when neither loading nor disabled
  // -------------------------------------------------------------------------
  it('does NOT apply app-btn--loading when neither loading nor disabled', () => {
    const wrapper = mount(AppButton, {
      props: { loading: false, disabled: false },
      global: { stubs: globalStubs },
    })
    const btn = wrapper.findComponent({ name: 'ion-button' })
    expect(btn.classes()).not.toContain('app-btn--loading')
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
