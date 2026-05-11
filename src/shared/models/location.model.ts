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

/**
 * A resolved place from Google Places Autocomplete.
 */
export interface PlaceResult {
  placeId: string
  address: string
  coordinates: Coordinates
}

/**
 * WebSocket message types received from the server.
 */
export type WsMessageType = 'location' | 'location_update' | 'ping' | 'pong'

/**
 * Inbound WebSocket message shape.
 */
export interface WsMessage {
  type: WsMessageType
  userId?: string | number
  latitude?: number
  longitude?: number
  timestamp?: number
  [key: string]: unknown
}

/**
 * Live tracking status returned by the server.
 */
export interface TrackingStatus {
  is_enabled: boolean
  is_blocked: boolean
  blocked_reason?: 'leave' | 'week_off' | 'block_time'
}
