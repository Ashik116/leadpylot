import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Notification Data Interface
 * 
 * NOTE: `read` is the canonical field for read status.
 * `readed` is kept for backward compatibility but should be considered deprecated.
 * All new code should use `read`.
 */
export interface NotificationData {
    id: string;
    target: string;
    description: string;
    date: string;
    image: string;
    type: number;
    location: string;
    locationLabel: string;
    status: string;
    /** @deprecated Use `read` instead. Kept for backward compatibility. */
    readed: boolean;
    /** Canonical read status field */
    read: boolean;
    offerId?: string;
    priority?: 'low' | 'medium' | 'high';
    category?: string;
    isRealtime?: boolean;
    notificationType?: string;
    leadId?: string;
    projectId?: string;
    metadata?: any;
    timestamp?: string;
    data?: any;
    dbId?: string;
    title?: string;
    message?: string;
}

/**
 * Helper to check if notification is read (handles both fields)
 */
export const isNotificationRead = (notification: NotificationData): boolean => {
    return notification.read === true || notification.readed === true;
};

/**
 * Helper to normalize read status (ensures both fields are in sync)
 */
export const normalizeReadStatus = (notification: Partial<NotificationData>): Partial<NotificationData> => {
    const isRead = notification.read === true || notification.readed === true;
    return {
        ...notification,
        read: isRead,
        readed: isRead, // Keep in sync for backward compatibility
    };
};

interface NotificationState {
    notifications: NotificationData[];
    unreadCount: number;
    isLoading: boolean;
    error: string | null;
    isUpdating: Set<string>;
    lastSyncTime: string | null;

    setNotifications: (notifications: NotificationData[]) => void;
    addNotification: (notification: NotificationData) => void;
    addNotifications: (notifications: NotificationData[]) => void;
    updateNotification: (id: string, updates: Partial<NotificationData>) => void;
    removeNotification: (id: string) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    markCategoryAsRead: (category: string) => void;
    bulkMarkAsRead: (ids: string[]) => void;
    bulkDelete: (ids: string[]) => void;
    setUnreadCount: (count: number) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setIsUpdating: (id: string, isUpdating: boolean) => void;
    setLastSyncTime: (time: string) => void;
    clearNotifications: () => void;
    reset: () => void;
}

/** Maximum notifications to keep in memory for performance */
const MAX_NOTIFICATIONS = 500;

const CATEGORY_MAPPINGS: Record<string, string[]> = {
    email: ['email', 'email_system_received', 'email_received'],
    login: ['agent_login', 'agent_logout'],
    offer: ['offer_created', 'opening_created', 'confirmation_created', 'payment_voucher_created', 'netto1_created', 'netto2_created'],
    others: ['lead_assigned', 'lead_assignment_admin', 'project_created', 'project_assigned', 'lead_status_changed', 'commission_earned', 'revenue_target_met', 'lead_converted', 'system_maintenance', 'user_role_changed', 'email_comment_mention', 'email_comment_added'],
};

const initialState = {
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,
    isUpdating: new Set<string>(),
    lastSyncTime: null,
};

/**
 * Calculate unread count using the helper function
 */
const calculateUnreadCount = (notifications: NotificationData[]) => {
    return notifications.filter(n => !isNotificationRead(n)).length || 0;
};

export const useNotificationStore = create<NotificationState>()(
    devtools(
        (set) => ({
            ...initialState,
            setNotifications: (notifications) => {
                // Deduplicate by id to ensure unique notifications
                const uniqueById = notifications.reduce<NotificationData[]>((acc, current) => {
                    if (!acc.find(n => n.id === current.id)) {
                        acc.push(current);
                    }
                    return acc;
                }, []);

                // Preserve API order (backend handles sort/order query params)
                const ordered = uniqueById.slice(0, MAX_NOTIFICATIONS);
                set({ notifications: ordered, unreadCount: calculateUnreadCount(ordered) }, false, 'setNotifications');
            },

            addNotification: (notification) => set((state) => {
                // console.log({ "addNotification": notification });
                if (state.notifications.some(n => n.id === notification.id)) return state;
                const notifications = [notification, ...state.notifications].slice(0, MAX_NOTIFICATIONS);
                return { notifications, unreadCount: calculateUnreadCount(notifications) };
            }, false, 'addNotification'),

            addNotifications: (newNotifications) => set((state) => {
                const existingIds = new Set(state.notifications.map(n => n.id));
                const filtered = newNotifications.filter(n => !existingIds.has(n.id));
                if (filtered.length === 0) return state;

                // Preserve API order while appending next pages
                const notifications = [...state.notifications, ...filtered].slice(0, MAX_NOTIFICATIONS);

                return { notifications, unreadCount: calculateUnreadCount(notifications) };
            }, false, 'addNotifications'),

            updateNotification: (id, updates) => set((state) => {
                const notifications = state.notifications.map(n => n.id === id ? { ...n, ...updates } : n);
                return { notifications, unreadCount: calculateUnreadCount(notifications) };
            }, false, 'updateNotification'),

            removeNotification: (id) => set((state) => {
                const notifications = state.notifications.filter(n => n.id !== id);
                return { notifications, unreadCount: calculateUnreadCount(notifications) };
            }, false, 'removeNotification'),

            markAsRead: (id) => set((state) => {
                const notification = state.notifications.find(n => n.id === id);
                if (!notification || isNotificationRead(notification)) return state;

                // Sync both read and readed fields
                const notifications = state.notifications.map(n => 
                    n.id === id ? { ...n, read: true, readed: true } : n
                );
                return { notifications, unreadCount: Math.max(0, state.unreadCount - 1) };
            }, false, 'markAsRead'),

            markAllAsRead: () => set((state) => ({
                // Sync both read and readed fields
                notifications: state.notifications.map(n => ({ ...n, read: true, readed: true })),
                unreadCount: 0
            }), false, 'markAllAsRead'),

            markCategoryAsRead: (category) => set((state) => {
                const categoryTypes = CATEGORY_MAPPINGS[category] || [];
                // Sync both read and readed fields
                const notifications = state.notifications.map(n =>
                    !isNotificationRead(n) && categoryTypes.includes(n.notificationType || '') 
                        ? { ...n, read: true, readed: true } 
                        : n
                );
                return { notifications, unreadCount: calculateUnreadCount(notifications) };
            }, false, 'markCategoryAsRead'),

            bulkMarkAsRead: (ids) => set((state) => {
                // Sync both read and readed fields
                const notifications = state.notifications.map(n =>
                    ids.includes(n.id) && !isNotificationRead(n)
                        ? { ...n, read: true, readed: true }
                        : n
                );
                return { notifications, unreadCount: calculateUnreadCount(notifications) };
            }, false, 'bulkMarkAsRead'),

            bulkDelete: (ids) => set((state) => {
                const notifications = state.notifications.filter(n => !ids.includes(n.id));
                return { notifications, unreadCount: calculateUnreadCount(notifications) };
            }, false, 'bulkDelete'),

            setUnreadCount: (count) => set({ unreadCount: Number(count) || 0 }, false, 'setUnreadCount'),
            setLoading: (loading) => set({ isLoading: loading }, false, 'setLoading'),
            setError: (error) => set({ error }, false, 'setError'),

            setIsUpdating: (id, isUpdating) => set((state) => {
                const newUpdatingSet = new Set(state.isUpdating);
                isUpdating ? newUpdatingSet.add(id) : newUpdatingSet.delete(id);
                return { isUpdating: newUpdatingSet };
            }, false, 'setIsUpdating'),

            setLastSyncTime: (time) => {
                set({ lastSyncTime: time }, false, 'setLastSyncTime');
                if (typeof window !== 'undefined') {
                    localStorage.setItem('lastNotificationSync', time);
                }
            },

            clearNotifications: () => set({ notifications: [], unreadCount: 0 }, false, 'clearNotifications'),
            reset: () => set(initialState, false, 'reset'),
        }),
        { name: 'NotificationStore' }
    )
);

// Optimized selectors
export const useNotifications = () => useNotificationStore(state => state.notifications);
export const useUnreadCount = () => useNotificationStore(state => state.unreadCount);
export const useNotificationLoading = () => useNotificationStore(state => state.isLoading);
export const useNotificationError = () => useNotificationStore(state => state.error);
export const useIsUpdating = () => useNotificationStore(state => state.isUpdating.size > 0);

// Filtered selectors
export const useUnreadNotifications = () => useNotificationStore(
    state => state.notifications.filter(n => !isNotificationRead(n))
);
export const useReadNotifications = () => useNotificationStore(
    state => state.notifications.filter(n => isNotificationRead(n))
);
