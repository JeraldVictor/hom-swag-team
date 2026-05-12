/**
 * Progression states for a beautician's service order.
 */
export type OrderStatus =
  | 'Confirmed'
  | 'Ongoing'
  | 'Started'
  | 'Completed'
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
  remark?: string
  staff_comment?: string
  internal_comment?: string
}

export interface UpdateOrderPayload {
  products?: unknown[]
  delivery_address?: unknown
  status_reason?: string
  payment?: PaymentInfo
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
  payment?: PaymentInfo
  tip?: number
  cod_collected_amount?: number
  /** Photo taken on arrival */
  arrival_selfie?: { url?: string; key?: string }
  /** Photos/screenshots uploaded for completion proof */
  proof_of_service?: Array<{ url?: string; key?: string }>
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
  selected_options?: {
    order_product_option_id?: string
    product_option_id: string
    title: string
    price?: number
  }[]
  selected_package_items?: string[] // Array of product IDs
  selected_free_items?: {
    order_free_item_id?: string
    product_id: string
    title: string
  }[]
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
  status: 'started' | 'ongoing' | 'completed' | 'arrived_and_cancelled' | 'cancelled'
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
