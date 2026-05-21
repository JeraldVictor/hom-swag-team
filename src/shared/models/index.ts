/**
 * Shared Models — barrel export
 *
 * Re-exports all domain model types from a single entry point.
 * Import models from '@/shared/models' rather than individual model files.
 */

// Auth models
export type {
  AuthResponse,
  LogoutBody,
  OtpRequestBody,
  OtpVerifyBody,
  RefreshTokenBody,
  TokenPair,
} from './auth.model'
// Calendar models
export type { CalendarData, CalendarEvent, CalendarEventType } from './calendar.model'
// Complaint models
export type { Complaint } from './complaint.model'
// Dashboard models
export type { DashboardData } from './dashboard.model'
// External Booking models
export type {
  ExternalBooking,
  ExternalBookingBody,
  ExternalBookingStatus,
} from './external-booking.model'
// Leaderboard models
export type { LeaderboardData, LeaderboardEntry, LeaderboardPeriod } from './leaderboard.model'
// Leave request models
export type {
  LeaveBalance,
  LeaveDuration,
  LeaveRequest,
  LeaveRequestBody,
  LeaveStatus,
  LeaveType,
} from './leave-request.model'
// Location models
export type {
  Coordinates,
  LocationPayload,
  PlaceResult,
  WsMessage,
  WsMessageType,
} from './location.model'
// Menu models
export type { Category, MainMenu, MenuResponse, SubCategory } from './menu.model'

// Notification models
export type { Notification, NotificationsResponse } from './notification.model'
// Order models
export type {
  Order,
  OrderAddress,
  OrderBookingInfo,
  OrderCustomer,
  OrderProduct,
  OrderStatus,
  OrderTrip,
  OrderTripRider,
  PaymentStatus,
  UpdateOrderPayload,
  UpdateOrderStatusBody,
  UpgradeProductBody,
  VerifyServiceOtpBody,
} from './order.model'
// OT Request models
export type {
  OtRequest,
  OtRequestBody,
  OtRequestCreateBody,
  OtRequestStatus,
} from './ot-request.model'
// Pagination models
export type { PaginatedResponse } from './pagination.model'
// Product models
export type { Product, ProductOption } from './product.model'
// Reimbursement models
export type {
  Reimbursement,
  ReimbursementBody,
  ReimbursementStatus,
  ReimbursementType,
} from './reimbursement.model'
// SOS models
export type { SosAlert, SosStatus, SosTriggerBody } from './sos.model'
// Support models
export type { SupportBody, SupportCategory, SupportTicket } from './support.model'
// Trip models
export type { GeoJsonPoint, RawTrip, Trip, TripKanbanState } from './trip.model'
// Trip Fees models
export type { TripFeeEntry, TripFeesReport } from './trip-fees.model'
// User models
export type { ProfileDocument, UserProfile, UserType } from './user.model'
// Weekly Off models
export type {
  DayOfWeek,
  WeeklyOffCreateBody,
  WeeklyOffRequest,
  WeeklyOffRequestBody,
  WeeklyOffStatus,
} from './weekly-off.model'
