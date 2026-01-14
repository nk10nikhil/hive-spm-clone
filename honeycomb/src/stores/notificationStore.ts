import { create } from 'zustand'

// =============================================================================
// Types
// =============================================================================

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'budget'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: string
  read: boolean
  metadata?: Record<string, unknown>
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number

  // Actions
  addNotification: (
    notification: Omit<Notification, 'id' | 'timestamp' | 'read'>
  ) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAll: () => void
}

// =============================================================================
// Helpers
// =============================================================================

function generateId(): string {
  return crypto.randomUUID()
}

function computeUnreadCount(notifications: Notification[]): number {
  return notifications.filter((n) => !n.read).length
}

// =============================================================================
// Store
// =============================================================================

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) =>
    set((state) => {
      const newNotification: Notification = {
        ...notification,
        id: generateId(),
        timestamp: new Date().toISOString(),
        read: false,
      }
      const notifications = [newNotification, ...state.notifications]
      return {
        notifications,
        unreadCount: computeUnreadCount(notifications),
      }
    }),

  markAsRead: (id) =>
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
      return {
        notifications,
        unreadCount: computeUnreadCount(notifications),
      }
    }),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  clearAll: () =>
    set({
      notifications: [],
      unreadCount: 0,
    }),
}))
