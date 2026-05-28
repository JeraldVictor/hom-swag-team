/**
 * useCamera
 *
 * Wraps `@capacitor-community/camera-preview` with a custom UI modal
 * for a smoother, in-app camera experience with flip support.
 */

import { modalController } from '@ionic/vue'
import AppCameraModal from '../components/ui/AppCameraModal.vue'

export type CameraFacingMode = 'user' | 'environment'

export interface UseCameraOptions {
  facingMode?: CameraFacingMode
}

/**
 * Capture a photo using the in-app camera preview.
 *
 * @returns A Blob for upload.
 * @throws If the user cancels or permission is denied.
 */
async function takePhoto(options?: UseCameraOptions): Promise<Blob> {
  const modal = await modalController.create({
    component: AppCameraModal,
    componentProps: {
      facingMode: options?.facingMode || 'environment',
    },
    cssClass: 'camera-modal',
  })

  await modal.present()

  const { data, role } = await modal.onDidDismiss()

  if (role === 'confirm' && data instanceof Blob) {
    return data
  }

  if (role === 'error') {
    throw new Error('Camera failed to start')
  }

  throw new Error('Camera cancelled')
}

export function useCamera() {
  return {
    takePhoto,
  }
}
