import apiClient from '@/shared/lib/api'
import type { TargetDetailsData } from '@/shared/models/target-details.model'

export async function getTargetDetails(params?: {
  month?: number
  year?: number
}): Promise<TargetDetailsData> {
  const response = await apiClient.get<{ data: TargetDetailsData }>('/target-details', { params })
  return response.data.data
}
