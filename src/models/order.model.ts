/**
 * Progression states for a beautician's service order.
 * Maps to the Timeline_Component steps for the beautician flow.
 */
export type OrderStatus = 'Confirmed' | 'Ongoing' | 'Started' | 'Completed'

/**
 * Customer address associated with an order.
 */
export interface OrderAddress {
  line1: string
  line2?: string
  city: string
  state?: string
  pincode?: string
  latitude?: number
  longitude?: number
}

/**
 * Customer information embedded in an order.
 */
export interface OrderCustomer {
  id: string | number
  name: string
  phone: string
}

/**
 * A service booking entity assigned to a beautician.
 * The `status` field drives the Timeline_Component progression.
 */
export interface Order {
  id: string | number
  status: OrderStatus
  /** ISO 8601 date string for the scheduled service date */
  service_date: string
  customer: OrderCustomer
  address: OrderAddress
  /** ISO 8601 date-time string */
  created_at?: string
  /** ISO 8601 date-time string */
  updated_at?: string
  notes?: string
}
