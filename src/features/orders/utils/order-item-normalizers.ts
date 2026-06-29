export interface PackageServiceDisplayItem {
  product_id: string
  title: string
  price?: number
  duration?: number
  banner?: DisplayImage
  image?: DisplayImage
  beautician_added?: boolean
}

interface DisplayImage {
  url: string
  alt_text?: string
}

type RawPackageService =
  | string
  | number
  | {
      product_id?: string | number
      _id?: string | number
      id?: string | number
      title?: string
      name?: string
      product_title?: string
      product_name?: string
      product?: {
        title?: string
        name?: string
      }
      price?: number
      min_price?: number
      base_price?: number
      duration?: number
      duration_minutes?: number
      banner?: DisplayImage
      image?: DisplayImage
      beautician_added?: boolean
    }

interface PackageServiceContainer {
  selected_package_items?: readonly RawPackageService[]
  selected_package_services?: readonly RawPackageService[]
  services?: readonly RawPackageService[]
  package_services?: readonly RawPackageService[]
}

function isPackageServiceObject(
  service: RawPackageService
): service is Exclude<RawPackageService, string | number> {
  return typeof service === 'object' && service !== null
}

function packageServiceLabel(service: RawPackageService): string {
  if (!isPackageServiceObject(service)) return String(service)
  return (
    service.title ||
    service.name ||
    service.product_title ||
    service.product_name ||
    service.product?.title ||
    service.product?.name ||
    String(service.product_id || service._id || service.id || '')
  )
}

function packageServiceId(service: RawPackageService): string {
  if (!isPackageServiceObject(service)) return String(service)
  return String(service.product_id || service._id || service.id || packageServiceLabel(service))
}

export function getPackageServices(
  packageItem: Readonly<PackageServiceContainer>
): PackageServiceDisplayItem[] {
  const services = packageItem.selected_package_services?.length
    ? packageItem.selected_package_services
    : packageItem.selected_package_items?.length
      ? packageItem.selected_package_items
      : packageItem.services?.length
        ? packageItem.services
        : packageItem.package_services || []

  return services
    .map(service => ({
      product_id: packageServiceId(service),
      title: packageServiceLabel(service),
      price: isPackageServiceObject(service)
        ? (service.price ?? service.min_price ?? service.base_price)
        : undefined,
      duration: isPackageServiceObject(service)
        ? (service.duration ?? service.duration_minutes)
        : undefined,
      banner: isPackageServiceObject(service) ? service.banner : undefined,
      image: isPackageServiceObject(service) ? service.image : undefined,
      beautician_added: isPackageServiceObject(service) ? service.beautician_added : undefined,
    }))
    .filter(service => service.title.length > 0)
}
