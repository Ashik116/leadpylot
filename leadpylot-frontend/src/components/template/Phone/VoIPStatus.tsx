'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGetVoipServers } from '@/services/SettingsService';
import { useSafeJsSIP } from '@/hooks/useJsSIP';
import { useSelectedProjectStore } from '@/stores/selectedProjectStore';
import Card from '@/components/ui/Card';
import Tag from '@/components/ui/Tag';
import { CONNECT_STATUS, RegisterStatus } from '@/hooks/useJsSIP';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useGlobalAdminSIP } from '@/hooks/useGlobalAdminSIP';
import { useSession } from '@/hooks/useSession';

export const VoIPStatus = () => {
  const { data: session } = useSession();
  const { data: voipServers, isLoading } = useQuery({
    queryKey: ['voip-servers'],
    queryFn: apiGetVoipServers,
  });

  const { connectStatus, registerStatus } = useSafeJsSIP();
  const { selectedProject } = useSelectedProjectStore();
  const { adminCredentials, voipServerInfo } = useGlobalAdminSIP();

  const isAdmin = session?.user?.role === Role.ADMIN;
  
  // SIP credentials from user profile (single extension per user)
  const sipCredentials = {
    voip_username: session?.user?.voip_extension || adminCredentials.voip_username,
    voip_password: session?.user?.voip_password || adminCredentials.voip_password,
  };

  const serverInfo = isAdmin ? voipServerInfo : voipServers?.data?.[0]?.info;

  if (isLoading) return <div>Loading VoIP status...</div>;

  return (
    <Card className="mt-4" header={{ content: <h4>Phone Status</h4> }}>
      <div className="space-y-3">
        {/* System Health */}
        <div className="text-center">
          {serverInfo && sipCredentials.voip_username && sipCredentials.voip_password ? (
            connectStatus === CONNECT_STATUS.CONNECTED &&
            registerStatus === RegisterStatus.REGISTERED ? (
              <Tag prefix prefixClass="bg-evergreen" className="px-4 py-2 text-lg">
                ✅ Ready for calls {isAdmin ? '(Admin)' : '(Agent)'}
              </Tag>
            ) : (
              <Tag prefix prefixClass="bg-amber-500" className="px-4 py-2 text-lg">
                ⚠️ Connecting...
              </Tag>
            )
          ) : (
            <Tag prefix prefixClass="bg-rust" className="px-4 py-2 text-lg">
              ❌ Setup required {isAdmin ? '(Admin config missing)' : '(Select project)'}
            </Tag>
          )}
        </div>

        {/* Extension Status */}
        {sipCredentials.voip_username && (
          <div className="text-center">
            <div className="text-sand-2 mb-1 text-sm">
              {isAdmin ? 'Admin Extension' : 'Agent Extension'}
            </div>
            <div className="font-mono text-lg font-semibold">{sipCredentials.voip_username}</div>
          </div>
        )}
      </div>
    </Card>
  );
};
