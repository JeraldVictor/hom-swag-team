/**
 * useDrawer
 *
 * Shared composable that holds the global menu drawer open/close state.
 * Both TabsLayout (opener) and AppDrawer (consumer) import from here
 * so they share the same reactive ref without prop drilling.
 */

import { ref } from 'vue'

const isDrawerOpen = ref(false)

export function useDrawer() {
  function openDrawer(): void {
    isDrawerOpen.value = true
  }

  function closeDrawer(): void {
    isDrawerOpen.value = false
  }

  function toggleDrawer(): void {
    isDrawerOpen.value = !isDrawerOpen.value
  }

  return {
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
  }
}
