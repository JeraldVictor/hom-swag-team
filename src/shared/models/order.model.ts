/**
 * Progression states for a beautician's service order.
 */
export type OrderStatus = 'Confirmed' | 'Ongoing' | 'Started' | 'Completed' | 'started' | 'ongoing' | 'completed' | 'arrived_and_cancelled'

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
}

/**
 * A product/service line item within an order.
 */
export interface OrderProduct {
  product_id: string
  title: string
  quantity: number
  price: number
  total: number
}

/**
 * Request body for updating order status.
 * Sent to PATCH /orders/:id/status
 */
export interface UpdateOrderStatusBody {
  status: 'started' | 'ongoing' | 'completed' | 'arrived_and_cancelled'
  status_reason?: string
}

/**
 * Request body for verifying service OTP.
 * Sent to POST /orders/:id/otp/verify
 */
export interface VerifyServiceOtpBody {
  otp: string
}
