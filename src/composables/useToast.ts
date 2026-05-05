/**
 * useToast
 *
 * Wraps Ionic's `toastController` to provide a simple, typed API for
 * displaying toast notifications with convenience colour variants.
 */

import { toastController } from '@ionic/vue'

const DEFAULT_DURATION = 3000

/**
 * Show a toast with an optional colour and duration.
 *
 * @param message  - The text to display in the toast
 * @param color    - Ionic colour token (e.g. 'success', 'danger', 'warning')
 * @param duration - Duration in milliseconds (default: 3000)
 */
async function showToast(
  message: string,
  color?: string,
  duration: number = DEFAULT_DURATION,
): Promise<void> {
  const toast = await toastController.create({
    message,
    duration,
    color,
    position: 'bottom',
  })
  await toast.present()
}

/** Show a success (green) toast. */
async function showSuccess(message: string, duration?: number): Promise<void> {
  return showToast(message, 'success', duration)
}

/** Show an error (red) toast. */
async function showError(message: string, duration?: number): Promise<void> {
  return showToast(message, 'danger', duration)
}

/** Show a warning (yellow/orange) toast. */
async function showWarning(message: string, duration?: number): Promise<void> {
  return showToast(message, 'warning', duration)
}

export function useToast() {
  return {
    showToast,
    showSuccess,
    showError,
    showWarning,
  }
}
