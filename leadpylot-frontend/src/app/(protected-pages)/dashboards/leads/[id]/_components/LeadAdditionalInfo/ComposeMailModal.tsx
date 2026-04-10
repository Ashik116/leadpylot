import Card from '@/components/ui/Card';
import Dialog from '@/components/ui/Dialog';
import { chatbotSendMailStore } from '@/stores/chatbotSendMailStore';
import useResponsive from '@/utils/hooks/useResponsive';
import ComposeMailDialog from '../LeadAdditionalInfo/ComposeMailDialog';
import { useLeadDetailsContext } from '../LeadDetailsContext';

interface ComposeMailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ComposeMailModal = ({ isOpen, onClose }: ComposeMailModalProps) => {
  const { lead, projectId, agentId, leadId } = useLeadDetailsContext();
  const mailData = chatbotSendMailStore((state) => state.mailData);
  const recipientEmail = mailData?.to || lead?.email_from;
  const recipientName = lead?.contact_name;
  const leadIdStr = String(leadId ?? '');
  const { smaller } = useResponsive();

  return (
    <>
      {/* Desktop - Inline layout */}
      {!smaller.lg && isOpen && (
        <Card className="w-full" bodyClass="p-0 m-0 rounded-none">
          <ComposeMailDialog
            isOpen={isOpen}
            onClose={onClose}
            projectId={projectId}
            agentId={agentId}
            leadId={leadIdStr}
            recipientEmail={recipientEmail}
            recipientName={recipientName}
            closeButton={true}
            lead={lead}
          />
        </Card>
      )}

      {/* Mobile Dialog */}
      {smaller.lg && (
        <Dialog className="p-0" isOpen={isOpen} onClose={onClose} width="90vw" height="auto">
          <ComposeMailDialog
            isOpen={isOpen}
            onClose={onClose}
            projectId={projectId}
            agentId={agentId}
            leadId={leadIdStr}
            recipientEmail={recipientEmail}
            recipientName={recipientName}
            closeButton={false}
            isMobile={true}
            lead={lead}
          />
        </Dialog>
      )}
    </>
  );
};

export default ComposeMailModal;
