/**
 * useDialog
 *
 * Wraps Ionic's `alertController`, `modalController`, and
 * `actionSheetController` with typed helper functions.
 */

import {
  actionSheetController,
  alertController,
  modalController,
} from '@ionic/vue'
import type { ActionSheetButton, AlertButton, ComponentRef } from '@ionic/vue'
import type { Component } from 'vue'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShowAlertOptions {
  header: string
  message: string
  buttons: AlertButton[] | string[]
}

export interface ShowModalOptions {
  component: Component | ComponentRef
  componentProps?: Record<string, unknown>
}

export interface ShowActionSheetOptions {
  header?: string
  buttons: ActionSheetButton[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Display an Ionic alert dialog and wait for it to be dismissed.
 *
 * @returns A promise that resolves with the alert's dismiss data (role/value).
 */
async function showAlert(options: ShowAlertOptions): Promise<{ role?: string; data?: unknown }> {
  const alert = await alertController.create({
    header: options.header,
    message: options.message,
    buttons: options.buttons,
  })
  await alert.present()
  const result = await alert.onDidDismiss()
  return result
}

/**
 * Display an Ionic modal and wait for it to be dismissed.
 *
 * @returns A promise that resolves with the modal's dismiss data.
 */
async function showModal<T = unknown>(options: ShowModalOptions): Promise<T | null> {
  const modal = await modalController.create({
    component: options.component as ComponentRef,
    componentProps: options.componentProps,
  })
  await modal.present()
  const { data } = await modal.onDidDismiss<T>()
  return data ?? null
}

/**
 * Display an Ionic action sheet and wait for it to be dismissed.
 *
 * @returns A promise that resolves with the action sheet's dismiss data.
 */
async function showActionSheet(
  options: ShowActionSheetOptions,
): Promise<{ role?: string; data?: unknown }> {
  const actionSheet = await actionSheetController.create({
    header: options.header,
    buttons: options.buttons,
  })
  await actionSheet.present()
  const result = await actionSheet.onDidDismiss()
  return result
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useDialog() {
  return {
    showAlert,
    showModal,
    showActionSheet,
  }
}
