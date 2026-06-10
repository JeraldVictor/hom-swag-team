export enum ORDER_STATUS {
  PENDING = 'pending',
  ASSIGNED_DRAFT = 'assigned_draft',
  CONFIRMED = 'confirmed',
  ONGOING = 'ongoing',
  REACHED_CUSTOMER_PLACE = 'reached_customer_place',
  STARTED = 'started',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  CANCEL_REQUESTED = 'cancel_requested',
  CANCELLED_AND_REFUNDED = 'cancelled_and_refunded',
  RE_ASSIGN_REQUIRED = 're_assign_required',
  ARRIVED_AND_CANCELLED = 'arrived_and_cancelled',
}
