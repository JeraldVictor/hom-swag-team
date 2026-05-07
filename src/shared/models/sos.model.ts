/**
 * SOS Alert model.
 * Field workers can trigger an SOS to alert office staff to call them.
 */

export type SosStatus = 'triggered' | 'acknowledged' | 'resolved'

export interface SosAlert {
  id: string | number
  _id?: string
  status: SosStatus
  /** Latitude at time of trigger */
  latitude?: number
  /** Longitude at time of trigger */
  longitude?: number
  message?: string
  requester_type?: 'beautician' | 'rider'
  /** ISO 8601 date-time string */
  triggered_at?: string
  /** ISO 8601 date-time string */
  acknowledged_at?: string
  /** ISO 8601 date-time string */
  resolved_at?: string
}

export interface SosTriggerBody {
  requester_id: string
  requester_type: 'beautician' | 'rider'
  latitude?: number
  longitude?: number
  message?: string
}
