/**
 * Feature Flags
 *
 * Single source of truth for all feature flags. Values are driven by Vite
 * environment variables so they can differ per environment without code changes.
 *
 * Usage:
 *   import { FEATURES } from '@/shared/lib/feature-flags'
 *   if (FEATURES.maps) { ... }
 *
 * Env variables (set in .env / .env.local / .env.prod):
 *   VITE_FEATURE_MAPS        — enables Maps JavaScript API + map UI
 *   VITE_FEATURE_DIRECTIONS  — enables Directions API route rendering
 *                              (only meaningful when VITE_FEATURE_MAPS=true)
 */

function flag(key: string): boolean {
  return import.meta.env[key] === 'true'
}

export const FEATURES = {
  /** Maps JavaScript API — renders the interactive Google Map */
  maps: flag('VITE_FEATURE_MAPS'),

  /**
   * Directions API — draws a driving route between pickup and drop.
   * Automatically false when maps is disabled.
   */
  directions: flag('VITE_FEATURE_MAPS') && flag('VITE_FEATURE_DIRECTIONS'),
} as const
