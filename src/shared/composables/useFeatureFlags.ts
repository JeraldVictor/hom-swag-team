import { onMounted, onUnmounted, ref } from 'vue'
import apiClient from '@/shared/lib/api'
import { webSocketService } from '@/shared/lib/websocket.service'

const flags = ref<Record<string, boolean>>({})

export function useFeatureFlags() {
  const isLoading = ref(false)

  const fetchFlags = async () => {
    isLoading.value = true
    try {
      const res = await apiClient.get<Record<string, boolean>>('/feature-flags')
      flags.value = res.data
    } catch (err) {
      console.error('Failed to fetch feature flags:', err)
    } finally {
      isLoading.value = false
    }
  }

  const handleUpdate = (data: { key: string; enabled: boolean; rules: any[] }) => {
    // In a real scenario, we might want to re-evaluate rules here if they depend on local state
    // But for simplicity, the server emits if it should be enabled for the room
    // However, global flags are emitted to everyone, so we might need to re-evaluate
    // For now, let's just refresh all flags to be safe and accurate
    fetchFlags()
  }

  const handleDelete = (data: { key: string }) => {
    delete flags.value[data.key]
  }

  // Helper to check if a flag is enabled
  const isEnabled = (key: string) => !!flags.value[key]

  return {
    flags,
    isLoading,
    fetchFlags,
    isEnabled,
    handleUpdate,
    handleDelete,
  }
}

// Initial fetch and socket setup can be done in App.vue or a plugin
export function initFeatureFlags() {
  const { fetchFlags, handleUpdate, handleDelete } = useFeatureFlags()

  fetchFlags()

  const unsubs = [
    webSocketService.on('feature_flag:updated', handleUpdate),
    webSocketService.on('feature_flag:deleted', handleDelete),
  ]

  return () => unsubs.forEach(unsub => unsub())
}
