/**
 * useNavigation
 *
 * Shared logic for opening navigation apps for viewing purposes.
 * Strictly avoids ride-sharing deep links that might trigger accidental trip creation.
 */

import { actionSheetController } from '@ionic/vue'

export function useNavigation() {
  async function openNavigationMenu(lat: number, lng: number, name: string) {
    const actionSheet = await actionSheetController.create({
      header: `Navigate to ${name}`,
      mode: 'ios',
      buttons: [
        {
          text: 'Google Maps',
          icon: 'i-lucide-map',
          handler: () => {
            window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_system')
          },
        },
        {
          text: 'Native Maps',
          icon: 'i-lucide-navigation',
          handler: () => {
            const url = /iPhone|iPad|iPod/i.test(navigator.userAgent)
              ? `maps://?q=${name}&ll=${lat},${lng}`
              : `geo:${lat},${lng}?q=${lat},${lng}(${name})`
            window.open(url, '_system')
          },
        },
        {
          text: 'Cancel',
          role: 'cancel',
          icon: 'i-lucide-x',
        },
      ],
    })
    await actionSheet.present()
  }

  return {
    openNavigationMenu,
  }
}
