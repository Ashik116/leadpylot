'use client';

import QueryProvider from './QueryProvider';
import SIPProviderComponent from './SIPProvider';
import SocketProvider from './SocketProvider';
import { NotificationSyncInitializer } from './NotificationSyncInitializer';
import { AuthProvider } from './AuthProvider';
import { ApiUrlRouteProvider } from './ApiUrlRouteProvider';
import { CurrentOfferIdProvider } from '@/hooks/useCurrentOfferId';
// import { FCMProvider } from './FCMProvider';

export default function GlobalProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        {/* <FCMProvider> */}
          <SocketProvider>
            <NotificationSyncInitializer>
              <ApiUrlRouteProvider>
                <CurrentOfferIdProvider>
                  <SIPProviderComponent>{children}</SIPProviderComponent>
                </CurrentOfferIdProvider>
              </ApiUrlRouteProvider>
            </NotificationSyncInitializer>
          </SocketProvider>
        {/* </FCMProvider> */}
      </AuthProvider>
    </QueryProvider>
  );
}
