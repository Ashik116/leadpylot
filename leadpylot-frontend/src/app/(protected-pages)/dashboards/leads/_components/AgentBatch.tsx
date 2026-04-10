import RoleGuard from '@/components/shared/RoleGuard';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { getAgentColor } from '@/utils/utils';

const AgentBatch = ({ agentName, agentColor, icon = false }: { agentName: string; agentColor: string; icon?: boolean }) => {
  const selectedAgentColor = agentColor?.includes('#') ? agentColor : false;
  const textColor = getAgentColor(agentName);

  return (
    <div className="flex items-center gap-1">
      {/* <span
        className={`${textColor} flex items-center justify-center rounded-sm text-xs uppercase xl:text-lg`}
      >
        {initial}
      </span> */}
      <p
        style={{ color: selectedAgentColor ? selectedAgentColor : '' }}
        className={`truncate text-sm font-medium ${textColor}`}
      >
        {agentName || '-'}
      </p>
      {icon && (
        <RoleGuard>
        <ApolloIcon name="chevron-arrow-down" className="h-3 w-3" />
      </RoleGuard>
      )}
    </div>
  );
};

export default AgentBatch;
