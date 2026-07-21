export interface TargetDetailsOrder {
  id: string
  order_number?: string | number
  service_date?: string
  customer_name: string
  order_cost: number
  total: number
  commission: number
  special_commission: number
  general_commission: number
  upgrade_addon_commission: number
}

export interface TargetDetailsTrip {
  id: string
  trip_number?: string
  service_date?: string
  distance_km: number
  commission: number
  petrol_commission: number
  weekly_commission: number
  is_commission_applicable: boolean
}

export interface TargetDetailsData {
  role: 'beautician' | 'rider'
  period: {
    month: number
    year: number
    date_from?: string
    date_to?: string
    label: string
  }
  targets: {
    target1: number
    target2: number
    target1_achieved: boolean
    target2_achieved: boolean
    achieved_revenue: number
    target2_bonus_amount: number
    earned_target2_bonus: number
  }
  leaderboard: {
    rank: number | null
    bonus: number
    prizes: number[]
  }
  summary: {
    orders_completed: number
    trips_completed: number
    total_order_cost: number
    total_special_commission: number
    total_general_commission: number
    payable_general_commission: number
    total_upgrade_addon_commission: number
    total_payable_commission: number
    total_petrol_commission: number
    total_weekly_commission: number
    total_trip_distance_km: number
    final_payable_amount: number
    expected_if_target1_achieved: number
    expected_if_target2_achieved: number
    total_tips: number
    total_complaint_deduction: number
    total_adjustment_amount: number
    total_commission_adjustment_amount: number
    total_petrol_adjustment_amount: number
    total_paid_amount: number
    total_paid_commission: number
    total_paid_petrol: number
    pending_amount: number
    pending_commission_amount: number
    pending_petrol_amount: number
  }
  orders: TargetDetailsOrder[]
  trips: TargetDetailsTrip[]
}
