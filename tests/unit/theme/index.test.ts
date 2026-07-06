import { describe, it, expect } from 'vitest'
import {
  colors,
  spacing,
  radius,
  fontSize,
  fontWeight,
  theme,
} from '@/core/theme/index'
import type { Colors, Spacing, Radius, FontSize, FontWeight, Theme } from '@/core/theme/index'

// ---------------------------------------------------------------------------
// Token shape tests
// ---------------------------------------------------------------------------

describe('colors token', () => {
  it('is defined and is an object', () => {
    expect(colors).toBeDefined()
    expect(typeof colors).toBe('object')
  })

  // Semantic color aliases required by Requirement 1.4
  const semanticAliases: (keyof Colors)[] = [
    'brand',
    'brandMid',
    'brandLight',
    'brandPale',
    'heroDeep',
    'heroDark',
    'background',
    'surface',
    'text',
    'textSecondary',
    'textMuted',
    'border',
    'success',
    'warning',
    'error',
    'info',
  ]

  it.each(semanticAliases)('has semantic alias "%s"', (alias) => {
    expect(colors).toHaveProperty(alias)
    expect(typeof colors[alias]).toBe('string')
    expect(colors[alias].length).toBeGreaterThan(0)
  })

  // Status color groups required by Requirement 1.5
  const statusGroups: (keyof Colors)[] = [
    'successBg',
    'successText',
    'warningBg',
    'warningText',
    'errorBg',
    'errorText',
    'infoBg',
    'infoText',
  ]

  it.each(statusGroups)('has status color group "%s"', (group) => {
    expect(colors).toHaveProperty(group)
    expect(typeof colors[group]).toBe('string')
    expect(colors[group].length).toBeGreaterThan(0)
  })

  it('brand color is a valid hex color', () => {
    expect(colors.brand).toMatch(/^#[0-9a-fA-F]{6}$/)
  })

  it('all color values are non-empty strings', () => {
    for (const [key, value] of Object.entries(colors)) {
      expect(typeof value, `colors.${key} should be a string`).toBe('string')
      expect((value as string).length, `colors.${key} should not be empty`).toBeGreaterThan(0)
    }
  })
})

describe('spacing token', () => {
  it('is defined and is an object', () => {
    expect(spacing).toBeDefined()
    expect(typeof spacing).toBe('object')
  })

  it('contains expected scale keys', () => {
    const expectedKeys = ['0', '1', '2', '3', '4', '5', '6', '8', '10', '12', '16', '20', '24']
    for (const key of expectedKeys) {
      expect(spacing).toHaveProperty(key)
    }
  })

  it('all spacing values end with "px"', () => {
    for (const [key, value] of Object.entries(spacing)) {
      expect(value, `spacing.${key} should end with px`).toMatch(/px$/)
    }
  })
})

describe('radius token', () => {
  it('is defined and is an object', () => {
    expect(radius).toBeDefined()
    expect(typeof radius).toBe('object')
  })

  it('contains expected keys', () => {
    const expectedKeys: (keyof Radius)[] = ['none', 'sm', 'md', 'lg', 'xl', '2xl', 'full']
    for (const key of expectedKeys) {
      expect(radius).toHaveProperty(key)
    }
  })

  it('"full" radius is 9999px', () => {
    expect(radius.full).toBe('9999px')
  })

  it('"none" radius is 0px', () => {
    expect(radius.none).toBe('0px')
  })
})

describe('fontSize token', () => {
  it('is defined and is an object', () => {
    expect(fontSize).toBeDefined()
    expect(typeof fontSize).toBe('object')
  })

  it('contains expected scale keys', () => {
    const expectedKeys: (keyof FontSize)[] = ['xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl', '3xl', '4xl']
    for (const key of expectedKeys) {
      expect(fontSize).toHaveProperty(key)
    }
  })

  it('all fontSize values end with "px"', () => {
    for (const [key, value] of Object.entries(fontSize)) {
      expect(value, `fontSize.${key} should end with px`).toMatch(/px$/)
    }
  })
})

describe('fontWeight token', () => {
  it('is defined and is an object', () => {
    expect(fontWeight).toBeDefined()
    expect(typeof fontWeight).toBe('object')
  })

  it('contains expected keys', () => {
    const expectedKeys: (keyof FontWeight)[] = ['regular', 'medium', 'semibold', 'bold', 'extrabold']
    for (const key of expectedKeys) {
      expect(fontWeight).toHaveProperty(key)
    }
  })

  it('"regular" weight is "400"', () => {
    expect(fontWeight.regular).toBe('400')
  })

  it('"bold" weight is "700"', () => {
    expect(fontWeight.bold).toBe('700')
  })
})

// ---------------------------------------------------------------------------
// Theme aggregator tests
// ---------------------------------------------------------------------------

describe('theme aggregator', () => {
  it('is defined', () => {
    expect(theme).toBeDefined()
  })

  it('contains all token groups', () => {
    expect(theme).toHaveProperty('colors')
    expect(theme).toHaveProperty('spacing')
    expect(theme).toHaveProperty('radius')
    expect(theme).toHaveProperty('fontSize')
    expect(theme).toHaveProperty('fontWeight')
  })

  it('theme.colors is the same reference as the exported colors object', () => {
    expect(theme.colors).toBe(colors)
  })

  it('theme.spacing is the same reference as the exported spacing object', () => {
    expect(theme.spacing).toBe(spacing)
  })

  it('theme.radius is the same reference as the exported radius object', () => {
    expect(theme.radius).toBe(radius)
  })

  it('theme.fontSize is the same reference as the exported fontSize object', () => {
    expect(theme.fontSize).toBe(fontSize)
  })

  it('theme.fontWeight is the same reference as the exported fontWeight object', () => {
    expect(theme.fontWeight).toBe(fontWeight)
  })
})

// ---------------------------------------------------------------------------
// TypeScript type export tests (compile-time checks via assignability)
// ---------------------------------------------------------------------------

describe('TypeScript type exports', () => {
  it('Colors type is assignable from colors object', () => {
    const c: Colors = colors
    expect(c).toBe(colors)
  })

  it('Spacing type is assignable from spacing object', () => {
    const s: Spacing = spacing
    expect(s).toBe(spacing)
  })

  it('Radius type is assignable from radius object', () => {
    const r: Radius = radius
    expect(r).toBe(radius)
  })

  it('FontSize type is assignable from fontSize object', () => {
    const fs: FontSize = fontSize
    expect(fs).toBe(fontSize)
  })

  it('FontWeight type is assignable from fontWeight object', () => {
    const fw: FontWeight = fontWeight
    expect(fw).toBe(fontWeight)
  })

  it('Theme type is assignable from theme object', () => {
    const t: Theme = theme
    expect(t).toBe(theme)
  })
})
