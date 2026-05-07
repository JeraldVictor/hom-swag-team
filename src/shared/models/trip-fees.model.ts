/**
 * Trip Fees Report model.
 * Riders can view a breakdown of their trip earnings and fees.
 */

export interface TripFeeEntry {
  trip_id: string
  trip_number: string
  /** ISO 8601 date string */
  date: string
  distance_km?: number
  fare: number
  /** Platform fee or deduction */
  deduction?: number
  /** Net payout after deductions */
  net_amount: number
  status?: 'pending' | 'paid'
}

export interface TripFeesReport {
  period_label: string
  /** ISO 8601 date string */
  from_date: string
  /** ISO 8601 date string */
  to_date: string
  total_trips: number
  total_fare: number
  total_deductions: number
  total_net: number
  entries: TripFeeEntry[]
}
