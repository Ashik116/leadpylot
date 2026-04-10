import { useContext } from 'react';
import { useSession } from '@/hooks/useSession';
import SessionContext from '@/components/providers/AuthProvider/SessionContext';

const useCurrentSession = () => {
  const context = useContext(SessionContext);
  const { data: clientSession, status } = useSession();

  // Use client session if authenticated (reactive to login changes)
  // Fall back to server context for initial load performance
  const session =
    status === 'authenticated' && clientSession
      ? clientSession
      : context || {
          expires: '',
          user: {},
        };

  return {
    session,
    status,
  };
};

export default useCurrentSession;
