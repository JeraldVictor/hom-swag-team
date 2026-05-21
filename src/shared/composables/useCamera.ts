/**
 * useCamera
 *
 * Wraps `@capacitor/camera` to provide a simple `takePhoto()` method that
 * returns a base64 data URL string suitable for use in `<img src="...">`.
 */

import { Camera, CameraDirection } from '@capacitor/camera'

/**
 * Capture a photo using the device camera.
 *
 * @returns A Blob for upload.
 * @throws If the user cancels or permission is denied.
 */
async function takePhoto(): Promise<Blob> {
  const photo = await Camera.takePhoto({
    quality: 90,
    targetWidth: 1280,
    correctOrientation: true,
    cameraDirection: CameraDirection.Front,
  })

  if (photo.thumbnail) {
    const dataUrl = `data:image/jpeg;base64,${photo.thumbnail}`
    const response = await fetch(dataUrl)
    return await response.blob()
  }

  const path = photo.webPath ?? photo.uri
  if (!path) {
    throw new Error('Camera did not return a usable photo path')
  }

  const response = await fetch(path)
  if (!response.ok) {
    throw new Error('Failed to load captured photo')
  }

  return await response.blob()
}

export function useCamera() {
  return {
    takePhoto,
  }
}
