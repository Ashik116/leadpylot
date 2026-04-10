import RoleGuard from '@/components/shared/RoleGuard';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Tooltip from '@/components/ui/Tooltip';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { TLead } from '@/services/LeadsService';

const DELETE_LEAD_TOOLTIP =
  'Delete: permanently removes this lead from the CRM after you confirm. For admins only. Disabled while a reclamation is pending.';

const LeadDeleteButton = ({ onDelete, lead }: { onDelete: () => void; lead: TLead }) => {
  return (
    <>
      <RoleGuard role={Role.ADMIN}>
        <Tooltip
          title={DELETE_LEAD_TOOLTIP}
          placement="top"
          wrapperClass="inline-flex"
          className="max-w-sm! text-xs leading-snug"
        >
          <Button
            icon={<ApolloIcon name="trash" />}
            variant="destructive"
            onClick={onDelete}
            gapClass="gap-0 md:gap-1"
            disabled={lead?.reclamation_status === 'pending'}
            size="xs"
          >
            <span className="hidden md:block">Delete</span>
          </Button>
        </Tooltip>
      </RoleGuard>
    </>
  );
};

export default LeadDeleteButton;
