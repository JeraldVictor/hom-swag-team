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
export type { UserProfile, UserType, ProfileDocument } from './user.model'

// Order models
export type {
  Order,
  OrderStatus,
  OrderAddress,
  OrderCustomer,
  OrderBookingInfo,
  OrderProduct,
  UpdateOrderStatusBody,
  VerifyServiceOtpBody,
  UpgradeProductBody,
} from './order.model'

// Trip models
export type { Trip, TripKanbanState, RawTrip, GeoJsonPoint } from './trip.model'

// Leave request models
export type {
  LeaveRequest,
  LeaveRequestBody,
  LeaveStatus,
  LeaveDuration,
  LeaveType,
  LeaveBalance,
} from './leave-request.model'

// Location models
export type { LocationPayload, Coordinates, PlaceResult, WsMessage, WsMessageType } from './location.model'

// Product models
export type { Product } from './product.model'

// Pagination models
export type { PaginatedResponse } from './pagination.model'

// Notification models
export type { Notification, NotificationsResponse } from './notification.model'

// Complaint models
export type { Complaint } from './complaint.model'

// Session models
export type { Session } from './session.model'

// Support models
export type { SupportBody, SupportTicket, SupportCategory } from './support.model'

// Calendar models
export type { CalendarEvent, CalendarData, CalendarEventType } from './calendar.model'

// Dashboard models
export type { DashboardData } from './dashboard.model'

// OT Request models
export type { OtRequest, OtRequestBody, OtRequestCreateBody, OtRequestStatus } from './ot-request.model'

// Weekly Off models
export type { WeeklyOffRequest, WeeklyOffRequestBody, WeeklyOffCreateBody, WeeklyOffStatus, DayOfWeek } from './weekly-off.model'

// External Booking models
export type { ExternalBooking, ExternalBookingBody, ExternalBookingStatus } from './external-booking.model'

// Reimbursement models
export type { Reimbursement, ReimbursementBody, ReimbursementStatus, ReimbursementType } from './reimbursement.model'

// Leaderboard models
export type { LeaderboardEntry, LeaderboardData, LeaderboardPeriod } from './leaderboard.model'

// SOS models
export type { SosAlert, SosTriggerBody, SosStatus } from './sos.model'

// Trip Fees models
export type { TripFeeEntry, TripFeesReport } from './trip-fees.model'
