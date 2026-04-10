'use client';

import { useNotificationSync } from '@/hooks/useNotificationSync';
import { ReactNode } from 'react';

/**
 * Initializes notification sync without Context API
 * Uses Zustand store instead
 */
export const NotificationSyncInitializer = ({ children }: { children: ReactNode }) => {
    // This hook handles all the sync logic and updates the Zustand store
    useNotificationSync();

    return <>{children}</>;
};

