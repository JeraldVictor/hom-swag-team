import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '@/shared/api'
import type { Notification, RawNotification } from '@/shared/models/notification.model'

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([])
  const isLoading = ref(false)
  const unreadCount = ref(0)

  const hasUnread = computed(() => unreadCount.value > 0)

  const sortNotifications = (items: Notification[]) => {
    return items.slice().sort((a, b) => {
      if (a.is_read === b.is_read) {
        return new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime()
      }
      return Number(a.is_read) - Number(b.is_read)
    })
  }

  const normalizeNotifications = (items: Notification[]) => {
    return items.map(item => ({
      ...item,
      id: item.id || item._id || '',
    }))
  }

  const fetchNotifications = async () => {
    isLoading.value = true
    try {
      const res = await getNotifications({ is_read: null, page: '1', limit: '50' })
      notifications.value = sortNotifications(normalizeNotifications(res.data ?? []))
      // We assume the API might return unread_count, but if not we calculate it
      unreadCount.value = res.unread_count ?? notifications.value.filter(n => !n.is_read).length
    } catch (err) {
      console.error('Failed to fetch notifications', err)
    } finally {
      isLoading.value = false
    }
  }

  const markAsRead = async (idOrNotification: string | number | Notification) => {
    const idValue =
      typeof idOrNotification === 'object'
        ? idOrNotification.id || idOrNotification._id || ''
        : idOrNotification

    if (!idValue) {
      console.error('Failed to mark notification as read: missing notification id')
      return
    }

    try {
      await markNotificationRead(idValue.toString())
      const notif = notifications.value.find(
        n =>
          n.id === idValue ||
          n._id === idValue ||
          n.id === String(idValue) ||
          n._id === String(idValue)
      )
      if (notif && !notif.is_read) {
        notif.is_read = true
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
    } catch (err) {
      console.error('Failed to mark notification as read', err)
    }
  }

  const markAllRead = async () => {
    try {
      await markAllNotificationsRead()
      notifications.value.forEach(n => (n.is_read = true))
      unreadCount.value = 0
    } catch (err) {
      console.error('Failed to mark all notifications as read', err)
    }
  }

  const addNotification = (notification: RawNotification) => {
    const id = notification._id || notification.id
    if (!id) return

    if (!notifications.value.some(n => (n._id || n.id) === id)) {
      notifications.value.unshift({
        ...notification,
        id: id,
        _id: id.toString(),
        is_read: notification.is_read ?? false,
        created_at: notification.created_at || new Date().toISOString(),
      } as Notification)
      unreadCount.value++
      // Keep only last 50
      if (notifications.value.length > 50) {
        notifications.value.pop()
      }
    }
  }

  const clearNotifications = () => {
    notifications.value = []
    unreadCount.value = 0
    isLoading.value = false
  }

  return {
    notifications,
    isLoading,
    unreadCount,
    hasUnread,
    fetchNotifications,
    markAsRead,
    markAllRead,
    addNotification,
    clearNotifications,
  }
})
