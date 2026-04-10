import RoleGuard from '@/components/shared/RoleGuard';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Tooltip from '@/components/ui/Tooltip';
import { Role } from '@/configs/navigation.config/auth.route.config';
import LeadAssignmentDialog from './LeadAssignmentDialog';

const TRANSFER_ASSIGN_TOOLTIP =
  'Transfer / assign: opens a dialog to give this lead to another agent or change who owns it so the right person continues the work. Disabled while a reclamation is pending.';

const LeadAssignOrTransformButton = ({ assignment, lead, leadId }: any) => {
  return (
    <>
      <RoleGuard role={Role.ADMIN || Role?.PROVIDER}>
        <Tooltip
          title={TRANSFER_ASSIGN_TOOLTIP}
          placement="top"
          wrapperClass="inline-flex"
          className="max-w-sm! text-xs leading-snug"
        >
          <Button
            variant="solid"
            onClick={assignment?.handleAssignLead}
            icon={<ApolloIcon name="user-plus" className="text-lg" />}
            className=""
            gapClass="gap-0 md:gap-1"
            disabled={lead?.reclamation_status === 'pending'}
            size="xs"
          >
            <span className="hidden md:block">
              {assignment?.transformLeads ? 'Transfer' : 'Assign'}
            </span>
          </Button>
        </Tooltip>
      </RoleGuard>
      {assignment?.isAssignDialogOpen && (
        <LeadAssignmentDialog
          assignment={assignment}
          leadId={leadId}
          isOpen={assignment.isAssignDialogOpen}
          onClose={assignment.handleCloseAssignDialog}
          lead={lead}
        />
      )}
    </>
  );
};
export default LeadAssignOrTransformButton;
