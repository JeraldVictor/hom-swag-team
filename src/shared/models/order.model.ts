/**
 * Progression states for a beautician's service order.
 */
export type OrderStatus =
  | 'Confirmed'
  | 'Ongoing'
  | 'Started'
  | 'Completed'
  | 'reached_customer_place'
  | 'cancel_requested'
  | 'started'
  | 'ongoing'
  | 'completed'
  | 'arrived_and_cancelled'
  | 'cancelled'
  | 'cancelled_and_refunded'

export type PaymentStatus = 'pending' | 'paid' | 'unpaid' | 'conflict' | 'failed' | 'refunded'

export interface PaymentInfo {
  status?: PaymentStatus
  method?: string
  reference?: string
  amount_paid?: number
  order_amount?: number
  extra_amount?: number
  actual_paid_amount?: number
  change_given?: number
  refund_amount?: number
  partial_refund_amount?: number
  tip?: number
  cod_amount?: number
  upi_amount?: number
  remark?: string
  staff_comment?: string
  internal_comment?: string
  proof?: { url?: string; key?: string } | Array<{ url?: string; key?: string }>
}

export interface OrderInstructionPreset {
  _id?: string
  text?: string
  description?: string
  customer_facing?: boolean
  staff_visible?: boolean
  rider_visible?: boolean
  beautician_visible?: boolean
}

export interface UpdateOrderPayload {
  products?: unknown[]
  delivery_address?: unknown
  status_reason?: string
  payment?: PaymentInfo
  staff_notes?: string
  custom_instruction?: string
}

/**
 * Customer address associated with an order.
 */
export interface OrderAddress {
  line1?: string
  line2?: string
  street?: string
  landmark?: string
  city?: string
  state?: string
  pincode?: string
  latitude?: number | string
  longitude?: number | string
}

/**
 * Customer information embedded in an order.
 */
export interface OrderCustomer {
  id?: string | number
  user_id?: string
  name?: string
  full_name?: string
  phone?: string
  email?: string
}

/**
 * Booking info embedded in an order.
 */
export interface OrderBookingInfo {
  timing?: string
  date?: string
  effective_start_time?: string
  surge_amount?: number
  slot_id?: string
  beautician_start_time?: string
}

export interface OrderTripRider {
  id?: string
  _id?: string
  name?: string
  phone?: string
  vehicle_number?: string
  registration_number?: string
}

export interface OrderTripLocation {
  type?: 'Point'
  coordinates?: readonly [number, number]
}

export interface OrderTrip {
  id?: string
  _id?: string
  trip_number?: string
  kanban_state?: string
  start_time?: string
  end_time?: string
  fare?: number
  pickup_location?: OrderTripLocation
  drop_location?: OrderTripLocation
  rider?: OrderTripRider
  is_external_booking?: boolean
  external_booking_details?: {
    provider?: string
    cost?: number
    reimbursement_status?: string
  }
}

/**
 * A service booking entity assigned to a beautician.
 */
export interface Order {
  id: string | number
  _id?: string
  order_number?: string
  status: OrderStatus
  /** ISO 8601 date string for the scheduled service date */
  service_date?: string
  booking_info?: OrderBookingInfo
  customer?: OrderCustomer
  user_id?: string
  address?: OrderAddress
  delivery_address?: OrderAddress
  /** ISO 8601 date-time string */
  created_at?: string
  /** ISO 8601 date-time string */
  updated_at?: string
  notes?: string
  /** OTP for service start verification */
  service_otp?: string
  /** Products/services in the order */
  products?: OrderProduct[]
  /** Invoice info if available */
  invoice?: { id?: string; invoice_number?: number }
  subtotal?: number
  total?: number
  discount_total?: number
  delivery_fee?: number
  convenience_fees?: number
  hygiene_fees?: number
  rounding?: number
  payment?: PaymentInfo
  tip?: number
  cod_collected_amount?: number
  staff_notes?: string
  custom_instruction?: string
  instruction_presets?: OrderInstructionPreset[]
  /** Trip assignments for this order */
  trips?: OrderTrip[]
  /** Photo taken on arrival */
  arrival_selfie?: { url?: string; key?: string }
  /** Photos/screenshots uploaded for completion proof */
  proof_of_service?: Array<{ url?: string; key?: string }>
  /** Photos/screenshots uploaded to show setup before service start */
  setup_photos?: Array<{ url?: string; key?: string }>
  /** Verification metadata for service OTP generation */
  verification?: {
    otp_sent_at?: string
  }
  /** Office-specific payment QR code image returned with the order */
  office_payment_qr_code?: { url?: string; key?: string }
}

/**
 * A product/service line item within an order.
 */
export interface OrderProduct {
  order_product_id?: string
  product_id: string
  title: string
  quantity: number
  price: number
  total: number
  duration?: number
  type?: 'service' | 'package'
  selected_package_services?: ReadonlyArray<
    Readonly<{
      product_id: string
      title: string
    }>
  >
  selected_options?: ReadonlyArray<
    Readonly<{
      order_product_option_id?: string
      product_option_id: string
      title: string
      price?: number
      min_price?: number
      base_price?: number
    }>
  >
  selected_package_items?: ReadonlyArray<
    Readonly<{
      product_id: string
      title: string
    }>
  >
  selected_free_items?: ReadonlyArray<
    Readonly<{
      order_free_item_id?: string
      product_id: string
      title: string
    }>
  >
}

/**
 * Request body for upgrading a product in an order.
 */
export interface UpgradeProductBody {
  order_product_id: string
  new_product_id: string
  new_selected_options?: {
    product_option_id: string
  }[]
}

/**
 * Request body for updating order status.
 * Sent to PATCH /orders/:id/status
 */
export interface UpdateOrderStatusBody {
  status:
    | 'started'
    | 'ongoing'
    | 'reached_customer_place'
    | 'completed'
    | 'arrived_and_cancelled'
    | 'cancelled'
    | 'cancel_requested'
  status_reason?: string
  otp?: string
}

/**
 * Request body for verifying service OTP.
 * Sent to POST /orders/:id/otp/verify
 */
export interface VerifyServiceOtpBody {
  otp: string
}
