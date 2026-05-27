/**
 * useCamera
 *
 * Wraps `@capacitor/camera` to provide a simple `takePhoto()` method that
 * returns a base64 data URL string suitable for use in `<img src="...">`.
 */

import { Camera, CameraDirection } from '@capacitor/camera'

export type CameraFacingMode = 'user' | 'environment'

export interface UseCameraOptions {
  facingMode?: CameraFacingMode
}

function resolveCameraDirection(facingMode?: CameraFacingMode): CameraDirection {
  return facingMode === 'environment' ? CameraDirection.Rear : CameraDirection.Front
}

/**
 * Capture a photo using the device camera.
 *
 * @returns A Blob for upload.
 * @throws If the user cancels or permission is denied.
 */
async function takePhoto(options?: UseCameraOptions): Promise<Blob> {
  const photo = await Camera.takePhoto({
    quality: 90,
    editable: 'in-app',
    targetWidth: 1280,
    targetHeight: 1280,
    correctOrientation: true,
    cameraDirection: resolveCameraDirection(options?.facingMode),
    includeMetadata: true,
  })

  const path = photo.webPath ?? photo.uri
  if (path) {
    const response = await fetch(path)
    if (!response.ok) {
      throw new Error('Failed to load captured photo')
    }
    return await response.blob()
  }

  if (photo.thumbnail) {
    const format = photo.metadata?.format ?? 'jpeg'
    const dataUrl = `data:image/${format};base64,${photo.thumbnail}`
    const response = await fetch(dataUrl)
    return await response.blob()
  }

  throw new Error('Camera did not return a usable photo')
}

export function useCamera() {
  return {
    takePhoto,
  }
}
