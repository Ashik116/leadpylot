import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { JsSIPProvider } from './JsSIPProvider';
import useBrowserNotification from '@/utils/hooks/useBrowserNotification';
import useCallAudio from '@/utils/hooks/useCallAudio';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { isDev } from '@/utils/utils';
import { apiGetVoipServers } from '@/services/SettingsService';
import { useAuth } from '@/hooks/useAuth';

interface SIPProviderComponentProps {
  children: React.ReactNode;
}

export default function SIPProviderComponent({ children }: SIPProviderComponentProps) {
  const { user, isAuthenticated } = useAuth();
  const currentPath = usePathname();

  // Check if user is authenticated and not on auth pages
  const isUserAuthenticated = isAuthenticated && user;
  const isAuthPage =
    currentPath?.startsWith('/sign-in') ||
    currentPath?.startsWith('/forgot-password') ||
    currentPath?.startsWith('/reset-password');

  const { data, status, error } = useQuery({
    queryKey: ['voip-servers'],
    queryFn: apiGetVoipServers,
    enabled: isAuthenticated && !isAuthPage,
  });

  const firstServerInfo = data?.data?.[0]?.info;

  // Initialize audio and request notification permission
  useCallAudio();
  useBrowserNotification();

  // Return early if not authenticated or on auth pages
  if (!isUserAuthenticated || isAuthPage) {
    return children;
  }

  if (status === 'pending') return children;

  if (status === 'error') {
    // eslint-disable-next-line no-console
    isDev && console.error(error);

    if (user?.role === Role.PROVIDER) return children;
    // Toast notification removed - silent fail
  }

  if (firstServerInfo && firstServerInfo?.domain && firstServerInfo?.websocket_address)
    return (
      <JsSIPProvider
        domain={firstServerInfo?.domain}
        webSocketServer={firstServerInfo?.websocket_address}
      >
        {children}
      </JsSIPProvider>
    );
  else {
    // Toast notification removed - silent fail for missing voip server
    return children;
  }
}
