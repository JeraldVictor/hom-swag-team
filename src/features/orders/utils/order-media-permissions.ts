import { ORDER_STATUS } from '@/shared/constants'

export function canUploadSetupPhotos(
  status: string,
  hasArrivalSelfie: boolean,
  isEditable: boolean
): boolean {
  const normalizedStatus = status.toLowerCase()
  return (
    isEditable &&
    hasArrivalSelfie &&
    (normalizedStatus === ORDER_STATUS.REACHED_CUSTOMER_PLACE ||
      normalizedStatus === ORDER_STATUS.STARTED)
  )
}
