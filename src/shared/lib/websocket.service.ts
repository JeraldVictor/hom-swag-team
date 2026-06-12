/**
 * WebSocket Service (Socket.io version)
 *
 * Manages a persistent real-time connection to the BFF endpoint using Socket.io.
 * Handles authentication via the `auth` handshake object.
 */

import { io, type Socket } from 'socket.io-client'
import { ENV } from '@/shared/lib/env'
import type { Coordinates } from '@/shared/models/location.model'

/** Message structure for inbound events (legacy support or generic) */
export interface WsMessage {
  type: string
  [key: string]: unknown
}

type MessageListener = (message: WsMessage) => void
type EventHandler = (data: any) => void

class WebSocketService {
  private socket: Socket | null = null
  private currentToken: string | null = null
  private listeners: Set<MessageListener> = new Set()
  private eventHandlers: Map<string, Set<EventHandler>> = new Map()

  /** WebSocket server URL — falls back to http://localhost:3000 if not set. */
  private get wsUrl(): string {
    const configuredUrl = ENV.VITE_WS_URL || 'http://localhost:3000'

    try {
      const parsed = new URL(configuredUrl)
      const isLoopback = ['localhost', '127.0.0.1'].includes(parsed.hostname)

      if (
        isLoopback &&
        typeof window !== 'undefined' &&
        !['localhost', '127.0.0.1'].includes(window.location.hostname)
      ) {
        return `${parsed.protocol}//${window.location.hostname}${parsed.port ? `:${parsed.port}` : ''}`
      }

      return configuredUrl
    } catch {
      return configuredUrl
    }
  }

  /**
   * Connect to the Socket.io server.
   * Authentication is performed via the `auth` object in the handshake.
   *
   * @param token  The user's access token.
   */
  connect(token: string): void {
    if (this.socket?.connected && this.currentToken === token) return

    // If we're already connecting/connected with a different socket, clean it up
    if (this.socket) {
      this.socket.disconnect()
    }

    this.currentToken = token
    console.log('[WebSocketService] Connecting wsUrl=', this.wsUrl)
    this.socket = io(this.wsUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    })

    // Re-attach all existing event handlers to the new socket instance
    this.eventHandlers.forEach((handlers, event) => {
      handlers.forEach(handler => {
        this.socket?.on(event, handler)
      })
    })

    this.socket.on('connect', () => {
      console.log('[WebSocketService] Connected to server')
    })

    this.socket.on('disconnect', reason => {
      console.log('[WebSocketService] Disconnected:', reason)
    })

    this.socket.on('error', err => {
      console.error('[WebSocketService] Error:', err)
    })
  }

  /**
   * Disconnect from the server.
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.currentToken = null
  }

  /**
   * Returns true if the socket is currently connected.
   */
  get isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  /**
   * Emit a location update message.
   *
   * @param coords  The current GPS coordinates.
   */
  emitLocation(coords: Coordinates): void {
    if (!this.socket?.connected) {
      console.warn('[WebSocketService] Cannot emit location: socket disconnected')
      return
    }
    console.log('[WebSocketService] Emitting location:', coords)
    this.socket.emit('location', coords)
  }

  /**
   * Send any arbitrary event and payload.
   *
   * @param event    Event name
   * @param payload  The message object to send.
   */
  emit(event: string, payload: any): void {
    if (!this.socket?.connected) return
    console.log('[WebSocketService] Emitting event', event, payload)
    this.socket.emit(event, payload)
  }

  /**
   * Register a listener for a specific Socket.io event.
   * Returns an unsubscribe function.
   */
  on(event: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }

    this.eventHandlers.get(event)?.add(handler)

    // If socket is already initialized, attach immediately
    this.socket?.on(event, handler)

    return () => {
      this.eventHandlers.get(event)?.delete(handler)
      this.socket?.off(event, handler)
    }
  }

  /**
   * Register a listener for inbound WebSocket messages (Legacy support).
   * Note: This version might not be as useful with Socket.io's named events,
   * but kept for backward compatibility if needed.
   */
  onMessage(listener: MessageListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}

/** Singleton instance of the WebSocket Service. */
export const webSocketService = new WebSocketService()
export default webSocketService
