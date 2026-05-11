/**
 * useCamera
 *
 * Wraps `@capacitor/camera` to provide a simple `takePhoto()` method that
 * returns a base64 data URL string suitable for use in `<img src="...">`.
 */

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

/**
 * Capture a photo using the device camera or photo library.
 *
 * @returns A base64 data URL string (e.g. "data:image/jpeg;base64,...")
 * @throws  If the user cancels or permission is denied
 */
async function takePhoto(): Promise<string> {
  const photo = await Camera.getPhoto({
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Camera,
    quality: 90,
    width: 1280,
    correctOrientation: true,
  })

  if (!photo.dataUrl) {
    throw new Error('Camera did not return a data URL')
  }

  return photo.dataUrl
}

export function useCamera() {
  return {
    takePhoto,
  }
}
