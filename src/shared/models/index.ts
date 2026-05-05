/**
 * Shared Models — barrel export
 *
 * Re-exports all domain model types from a single entry point.
 * Import models from '@/shared/models' rather than individual model files.
 */

// Auth models
export type {
  OtpRequestBody,
  OtpVerifyBody,
  AuthResponse,
  TokenPair,
  RefreshTokenBody,
  LogoutBody,
} from './auth.model'

// User models
export type { UserProfile, UserType } from './user.model'

// Order models
export type { Order, OrderStatus, OrderAddress, OrderCustomer } from './order.model'

// Trip models
export type { Trip, TripKanbanState, RawTrip, GeoJsonPoint } from './trip.model'

// Leave request models
export type {
  LeaveRequest,
  LeaveRequestBody,
  LeaveStatus,
  LeaveDuration,
} from './leave-request.model'

// Location models
export type { LocationPayload, Coordinates, PlaceResult, WsMessage, WsMessageType } from './location.model'

// Product models
export type { Product } from './product.model'

// Pagination models
export type { PaginatedResponse } from './pagination.model'
