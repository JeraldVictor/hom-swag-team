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

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'partial'
  | 'unpaid'
  | 'conflict'
  | 'failed'
  | 'refunded'

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
  cancellation_charge?: number
  cancellation_paid_amount?: number
  cancellation_refund_amount?: number
  tip?: number
  cod_amount?: number
  upi_amount?: number
  remark?: string
  staff_comment?: string
  internal_comment?: string
  proof?: { url?: string; key?: string } | readonly { url?: string; key?: string }[]
  history?: readonly PaymentHistoryEntry[]
}

export interface PaymentHistoryEntry {
  label: string
  method?: string
  reference?: string
  amount: number
  status?: PaymentStatus | string
  remark?: string
  recorded_at: string
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

export interface OrderDisplayImage {
  url: string
  alt_text?: string
}

export interface UpdateOrderPayload {
  products?: Array<{
    order_product_id?: string
    product_id: string
    title: string
    quantity: number
    price: number
    total: number
    duration?: number
    banner?: OrderDisplayImage
    image?: OrderDisplayImage
    beautician_added?: boolean
    selected_options?: {
      order_product_option_id?: string
      product_option_id: string
      title: string
      price?: number
      duration?: number
      banner?: OrderDisplayImage
      image?: OrderDisplayImage
      beautician_added?: boolean
    }[]
    selected_package_items?: string[]
    selected_package_services?: {
      product_id: string
      title: string
      banner?: OrderDisplayImage
      image?: OrderDisplayImage
      beautician_added?: boolean
    }[]
    selected_free_items?: {
      free_product_id?: string
      title: string
      beautician_added?: boolean
    }[]
  }>
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
  building_info?: string
  landmark?: string
  city?: string
  state?: string
  pincode?: string
  gps?: string
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
  /** Used as the service start time for timing calculations */
  timing: string
  /** Source for service_date; parsed to Date type for efficient querying */
  date: string
  surge_amount: number

  slot_id: string // calendar‑slot entry id (template slot reference may also be derived)
  slot_calendar_id?: string // reference to the parent calendar document (optional)
  slot_booking_id?: string // associated slot booking record

  // Stored timing fields (computed on create/update — no runtime re-derivation needed)
  /** HH:MM 24h — start of the customer's selected slot (from timing split) */
  selected_start_time: string
  /** HH:MM 24h — end of the customer's selected slot (from timing split) */
  selected_end_time: string
  /** HH:MM 24h — actual service start (= selected_start_time) */
  effective_start_time: string
  /** HH:MM 24h — actual service end = effective_start_time + service_duration */
  effective_end_time: string
  /** HH:MM 24h — beautician arrival time (= selected_start_time − 10 min pre-travel) */
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
  is_self_drive?: boolean
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
  /** ISO 8601 date-time string */
  status_updated_at?: string
  /** ISO 8601 date-time string */
  booking_time?: string
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
  membership_plan_id?: string
  membership_charge?: number
  membership_discount_total?: number
  membership_free_item_total?: number
  one_time_discount_type?: 'percentage' | 'fixed'
  one_time_discount_value?: number
  one_time_discount_amount?: number
  delivery_fee?: number
  convenience_fees?: number
  hygiene_fees?: number
  rounding?: number
  payment?: PaymentInfo
  tip?: number
  cod_collected_amount?: number
  staff_notes?: string
  beautician_viewed?: boolean
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
  banner?: OrderDisplayImage
  image?: OrderDisplayImage
  beautician_added?: boolean
  selected_options?: {
    order_product_option_id?: string
    product_option_id: string
    title: string
    price: number
    duration?: number
    banner?: OrderDisplayImage
    image?: OrderDisplayImage
    beautician_added?: boolean
  }[]
  selected_free_items?: {
    order_free_item_id?: string
    free_product_id: string
    title: string
    beautician_added?: boolean
  }[]
  selected_package_items?: {
    product_id: string
    title: string
    price?: number
    duration?: number
    banner?: OrderDisplayImage
    image?: OrderDisplayImage
    beautician_added?: boolean
  }[]
  selected_package_services?: {
    product_id: string
    title: string
    price?: number
    duration?: number
    banner?: OrderDisplayImage
    image?: OrderDisplayImage
    beautician_added?: boolean
  }[]
  upgrade_info?: {
    original_product_id: string
    original_title: string
    original_price: number
    price_difference: number
    upgraded_by: string
    upgraded_by_name: string
    upgraded_by_role: 'staff' | 'beautician'
    upgraded_at: string
  }
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
  skip_proof?: boolean
}

/**
 * Request body for verifying service OTP.
 * Sent to POST /orders/:id/otp/verify
 */
export interface VerifyServiceOtpBody {
  otp: string
}
