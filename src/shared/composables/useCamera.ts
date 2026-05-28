/**
 * useCamera
 *
 * Wraps `@capacitor/camera` (iOS/Web) to provide a `takePhoto()` method that
 * returns a Blob for upload.
 *
 * Android does NOT support cameraDirection in Camera.takePhoto(). For front-facing
 * shots on Android we fall back to a native `<input capture="user">` file input
 * which opens the system camera pointed at the front lens, then show an in-app
 * review overlay (Use Photo / Retake / Cancel) before resolving.
 */

import { Camera, CameraDirection } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core'

export type CameraFacingMode = 'user' | 'environment'

export interface UseCameraOptions {
  facingMode?: CameraFacingMode
}

function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android'
}

function resolveCameraDirection(facingMode?: CameraFacingMode): CameraDirection | undefined {
  if (!facingMode) return undefined
  return facingMode === 'environment' ? CameraDirection.Rear : CameraDirection.Front
}

// ---------------------------------------------------------------------------
// In-app photo review overlay (Android only)
// ---------------------------------------------------------------------------

function showPhotoReview(blob: Blob): Promise<'use' | 'retake' | 'cancel'> {
  return new Promise(resolve => {
    const objectUrl = URL.createObjectURL(blob)

    const overlay = document.createElement('div')
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:99999;background:#000;display:flex;flex-direction:column;'

    const img = document.createElement('img')
    img.src = objectUrl
    img.style.cssText = 'flex:1;object-fit:contain;width:100%;min-height:0;'

    const btnRow = document.createElement('div')
    btnRow.style.cssText =
      'display:flex;gap:10px;padding:16px 20px 36px;background:rgba(0,0,0,0.85);flex-shrink:0;'

    const mkBtn = (label: string, style: string) => {
      const btn = document.createElement('button')
      btn.textContent = label
      btn.style.cssText = style
      return btn
    }

    const cancelBtn = mkBtn(
      'Cancel',
      'flex:1;padding:14px 0;border-radius:12px;background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.25);font-size:15px;cursor:pointer;'
    )
    const retakeBtn = mkBtn(
      'Retake',
      'flex:1;padding:14px 0;border-radius:12px;background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.25);font-size:15px;cursor:pointer;'
    )
    const useBtn = mkBtn(
      'Use Photo',
      'flex:2;padding:14px 0;border-radius:12px;background:#22c55e;color:#fff;border:none;font-size:15px;font-weight:600;cursor:pointer;'
    )

    btnRow.append(cancelBtn, retakeBtn, useBtn)
    overlay.append(img, btnRow)
    document.body.appendChild(overlay)

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
      overlay.remove()
    }

    useBtn.onclick = () => {
      cleanup()
      resolve('use')
    }
    retakeBtn.onclick = () => {
      cleanup()
      resolve('retake')
    }
    cancelBtn.onclick = () => {
      cleanup()
      resolve('cancel')
    }
  })
}

// ---------------------------------------------------------------------------
// Android front-camera capture via native file input
// ---------------------------------------------------------------------------

function captureWithFileInput(capture: 'user' | 'environment'): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.setAttribute('capture', capture)
    input.style.cssText = 'position:fixed;top:-200px;left:-200px;opacity:0;width:0;height:0;'

    let settled = false
    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      if (document.body.contains(input)) input.remove()
      fn()
    }

    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (file) finish(() => resolve(file))
      else finish(() => reject(new Error('User cancelled')))
    })

    document.body.appendChild(input)
    requestAnimationFrame(() => input.click())
  })
}

/** Android front-facing: capture then show review overlay; loops on Retake. */
async function captureWithAndroidFront(): Promise<Blob> {
  for (;;) {
    const blob = await captureWithFileInput('user')
    const action = await showPhotoReview(blob)
    if (action === 'use') return blob
    if (action === 'cancel') throw new Error('User cancelled')
    // action === 'retake' → loop again
  }
}

// ---------------------------------------------------------------------------
// Public takePhoto
// ---------------------------------------------------------------------------

/**
 * Capture a photo using the device camera.
 *
 * @returns A Blob for upload.
 * @throws If the user cancels or permission is denied.
 */
async function takePhoto(options?: UseCameraOptions): Promise<Blob> {
  // Android: Camera.takePhoto() does not support cameraDirection — use
  // native file input which honours capture="user" (front lens) on Android.
  if (isAndroid() && options?.facingMode === 'user') {
    return captureWithAndroidFront()
  }

  const cameraOptions = {
    quality: 90,
    editable: 'in-app',
    targetWidth: 1280,
    targetHeight: 1280,
    correctOrientation: true,
    includeMetadata: true,
  } as const

  const photo = await Camera.takePhoto({
    ...cameraOptions,
    ...(options?.facingMode ? { cameraDirection: resolveCameraDirection(options.facingMode) } : {}),
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
