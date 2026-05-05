/**
 * Design Token System — single source of truth for all visual design tokens.
 * All objects are `as const` so TypeScript infers the narrowest literal types.
 */

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

export const colors = {
  // Brand — purple/violet palette
  brand: '#7C3AED',
  brandMid: '#9D5CF6',
  brandLight: '#C4B5FD',
  brandPale: '#EDE9FE',

  // Hero — deep blue palette
  heroDeep: '#1E3A8A',
  heroDark: '#1E40AF',

  // Neutrals
  background: '#F9FAFB',
  surface: '#FFFFFF',
  text: '#111827',
  textSecondary: '#374151',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',

  // Semantic status
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',

  // Status color groups
  successBg: '#DCFCE7',
  successText: '#15803D',
  warningBg: '#FEF3C7',
  warningText: '#B45309',
  errorBg: '#FEE2E2',
  errorText: '#B91C1C',
  infoBg: '#DBEAFE',
  infoText: '#1D4ED8',

  // Raw palette (used internally / for reference)
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const

// ---------------------------------------------------------------------------
// Spacing (in px, expressed as string values for CSS usage)
// ---------------------------------------------------------------------------

export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const

// ---------------------------------------------------------------------------
// Border radius
// ---------------------------------------------------------------------------

export const radius = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  full: '9999px',
} as const

// ---------------------------------------------------------------------------
// Font sizes
// ---------------------------------------------------------------------------

export const fontSize = {
  xs: '11px',
  sm: '13px',
  base: '15px',
  md: '16px',
  lg: '18px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '30px',
  '4xl': '36px',
} as const

// ---------------------------------------------------------------------------
// Font weights
// ---------------------------------------------------------------------------

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const

// ---------------------------------------------------------------------------
// Theme aggregator
// ---------------------------------------------------------------------------

export const theme = {
  colors,
  spacing,
  radius,
  fontSize,
  fontWeight,
} as const

// ---------------------------------------------------------------------------
// TypeScript types derived via `typeof`
// ---------------------------------------------------------------------------

export type Colors = typeof colors
export type Spacing = typeof spacing
export type Radius = typeof radius
export type FontSize = typeof fontSize
export type FontWeight = typeof fontWeight
export type Theme = typeof theme
