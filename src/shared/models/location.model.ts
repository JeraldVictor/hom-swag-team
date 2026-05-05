/**
 * A simple latitude/longitude coordinate pair.
 */
export interface Coordinates {
  latitude: number
  longitude: number
}

/**
 * Location update payload sent to POST /location and emitted over WebSocket.
 */
export interface LocationPayload extends Coordinates {
  /** Unix timestamp in milliseconds */
  timestamp: number
  /** GPS accuracy in metres — optional, device-dependent */
  accuracy?: number
}
