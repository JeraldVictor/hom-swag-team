/**
 * Upload Service
 *
 * Handles multipart file uploads via the BFF API client.
 * Supports single-file and multi-file uploads with progress tracking.
 *
 * BFF response shapes:
 *   Single upload: { data: { url: string } }
 *   Multi upload:  { data: { urls: string[] } }
 */

import apiClient from '@/shared/lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Progress callback — receives a value from 0 to 100 */
export type UploadProgressCallback = (progress: number) => void

// ---------------------------------------------------------------------------
// UploadService class
// ---------------------------------------------------------------------------

class UploadServiceClass {
  /**
   * Upload a single file to the given endpoint.
   *
   * @param file       The File object to upload
   * @param endpoint   The BFF API endpoint path (e.g. `/uploads/photo`)
   * @param onProgress Optional callback receiving upload progress (0–100)
   * @returns          The URL string returned by the BFF API
   */
  async uploadFile(
    file: File,
    endpoint: string,
    onProgress?: UploadProgressCallback,
  ): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post<{ data: { url: string } }>(endpoint, formData, {
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(Math.min(percent, 100))
        }
      },
    })

    return response.data.data.url
  }

  /**
   * Upload multiple files in a single multipart request to the given endpoint.
   *
   * @param files      Array of File objects to upload
   * @param endpoint   The BFF API endpoint path (e.g. `/uploads/photos`)
   * @param onProgress Optional callback receiving upload progress (0–100)
   * @returns          Array of URL strings returned by the BFF API
   */
  async multipartUpload(
    files: File[],
    endpoint: string,
    onProgress?: UploadProgressCallback,
  ): Promise<string[]> {
    const formData = new FormData()
    for (const file of files) {
      formData.append('files', file)
    }

    const response = await apiClient.post<{ data: { urls: string[] } }>(endpoint, formData, {
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(Math.min(percent, 100))
        }
      },
    })

    return response.data.data.urls
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const UploadService = new UploadServiceClass()
