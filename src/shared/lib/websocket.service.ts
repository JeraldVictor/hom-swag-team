/**
 * WebSocket Service
 *
 * Manages a persistent WebSocket connection to the BFF real-time endpoint.
 * Authentication is performed by appending the access token as a `?token=`
 * query parameter in the WebSocket URL.
 *
 * Implements exponential backoff reconnection on connection loss:
 *   - Initial delay: 1 second
 *   - Doubles on each attempt
 *   - Maximum delay: 30 seconds
 *
 * Supports inbound message listeners so components can react to server-pushed
 * events (e.g. admin tracking updates, ping/pong).
 */

import type { Coordinates, WsMessage } from '@/shared/models/location.model'

/** Exponential backoff configuration. */
const BACKOFF_INITIAL_MS = 1_000
const BACKOFF_MAX_MS = 30_000

type MessageListener = (message: WsMessage) => void

class WebSocketService {
  private socket: WebSocket | null = null
  private token: string | null = null
  private reconnectAttempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private intentionalDisconnect = false
  private listeners: Set<MessageListener> = new Set()

  /** WebSocket server URL — falls back to ws://localhost:3000 if not set. */
  private get wsUrl(): string {
    return (import.meta.env.VITE_WS_URL as string | undefined) ?? 'ws://localhost:3000'
  }

  /**
   * Connect to the WebSocket server, authenticating with the provided token.
   * The token is passed as a `?token=<accessToken>` query parameter.
   *
   * @param token  The user's access token.
   */
  connect(token: string): void {
    this.token = token
    this.intentionalDisconnect = false
    this.reconnectAttempt = 0
    this._openSocket()
  }

  /**
   * Disconnect from the WebSocket server and cancel any pending reconnection.
   */
  disconnect(): void {
    this.intentionalDisconnect = true
    this._cancelReconnect()

    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }

  /**
   * Returns true if the socket is currently open.
   */
  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN
  }

  /**
   * Emit a location update message over the WebSocket connection.
   * The message format is: `{ type: 'location', latitude, longitude }`.
   *
   * @param coords  The current GPS coordinates.
   */
  emitLocation(coords: Coordinates): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return

    const message = JSON.stringify({ type: 'location', ...coords })
    this.socket.send(message)
  }

  /**
   * Send any arbitrary JSON message over the WebSocket connection.
   *
   * @param payload  The message object to send.
   */
  send(payload: Record<string, unknown>): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
    this.socket.send(JSON.stringify(payload))
  }

  /**
   * Register a listener for inbound WebSocket messages.
   * Returns an unsubscribe function.
   *
   * @param listener  Called with the parsed message object on each inbound message.
   */
  onMessage(listener: MessageListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private _openSocket(): void {
    if (!this.token) return

    const url = `${this.wsUrl}?token=${encodeURIComponent(this.token)}`
    this.socket = new WebSocket(url)

    this.socket.addEventListener('open', () => {
      // Reset backoff on successful connection.
      this.reconnectAttempt = 0
    })

    this.socket.addEventListener('message', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as WsMessage
        this.listeners.forEach((listener) => listener(data))
      } catch {
        // Ignore non-JSON messages
      }
    })

    this.socket.addEventListener('close', () => {
      if (!this.intentionalDisconnect) {
        this._scheduleReconnect()
      }
    })

    this.socket.addEventListener('error', () => {
      // The 'close' event will fire after 'error', so reconnection is handled there.
    })
  }

  private _scheduleReconnect(): void {
    const delay = Math.min(
      BACKOFF_INITIAL_MS * Math.pow(2, this.reconnectAttempt),
      BACKOFF_MAX_MS,
    )
    this.reconnectAttempt++

    this.reconnectTimer = setTimeout(() => {
      if (!this.intentionalDisconnect) {
        this._openSocket()
      }
    }, delay)
  }

  private _cancelReconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}

/** Singleton instance of the WebSocket Service. */
export const webSocketService = new WebSocketService()
export default webSocketService
