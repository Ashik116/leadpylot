'use client';
import { useState } from 'react';
import UpdatesActivitySkeleton, { UpdatesActivitySkeletonGroup } from '../UpdatesActivitySkeleton';
import EmailCard from '../EmailCard';
import Dialog from '@/components/ui/Dialog';
import { dateFormateUtils } from '@/utils/dateFormateUtils';
// import EmailDetail from '@/app/(protected-pages)/dashboards/mails/_components/EmailDetail';
import MailDetail from '@/app/(protected-pages)/dashboards/leads/[id]/_components/MailDetail';
import { useMailData } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/mailtabs/useMailData';

const EmailTab = ({ emailSystem }: any) => {
  const mailData = useMailData();
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const {
    groupedEmailNotifications,
    emailNotificationsLoading,
    emailNotificationsError,
    hasNextEmailPage,
    isFetchingNextEmailPage,
    loadMoreEmailRef,
    refetchEmails,
  } = emailSystem ?? {};

  const handleEmailClick = (emailId: string) => {
    setSelectedEmailId(emailId);
    setIsEmailDialogOpen(true);
  };

  const handleCloseEmailDialog = () => {
    setIsEmailDialogOpen(false);
    setSelectedEmailId(null);
    refetchEmails?.();
  };

  if (emailNotificationsLoading) {
    return (
      <div className="p-2">
        <UpdatesActivitySkeletonGroup />
      </div>
    );
  }

  if (emailNotificationsError) {
    return (
      <div className="p-6 text-center">
        <p className="text-rust text-sm">Error loading email notifications</p>
      </div>
    );
  }

  if (Object.keys(groupedEmailNotifications).length === 0) {
    return <p className="text-sand-2 mt-8 text-center text-sm">No emails</p>;
  }

  return (
    <>
      <div className="max-h-[400px] overflow-y-auto p-2">
        {/* Header with unseen emails count */}

        {Object.entries(groupedEmailNotifications)
          .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
          .map(([date, activities]) => (
            <div key={date} className="mb-4">
              <div className="mb-3 border-b border-gray-100 pb-2 text-center">
                <span className="text-sand-2 rounded-full bg-gray-50 px-3 py-1 text-sm font-medium">
                  {dateFormateUtils(date)}
                </span>
              </div>
              <div className="space-y-3">
                {(Array.isArray(activities) ? activities : []).map((activity: any) => (
                  <div key={activity?.id}>
                    <EmailCard activity={activity} onClick={handleEmailClick} />
                  </div>
                ))}
              </div>
            </div>
          ))}

        {/* Load more trigger element for email notifications */}
        {hasNextEmailPage && (
          <div ref={loadMoreEmailRef} className="py-4 text-center">
            {isFetchingNextEmailPage && <UpdatesActivitySkeleton />}
          </div>
        )}
      </div>

      {/* Email Detail Dialog */}
      {isEmailDialogOpen && selectedEmailId && (
        <Dialog
          isOpen={isEmailDialogOpen}
          onClose={handleCloseEmailDialog}
          width={1000}
          height="90dvh"
          contentClassName="p-0 mx-0"
        >
          {/* <NewEmailDetail emailId={selectedEmailId} closeSidebar={handleCloseEmailDialog} /> */}
          {/* <EmailDetail emailId={selectedEmailId} closeSidebar={handleCloseEmailDialog} /> */}
          <MailDetail
            emailId={selectedEmailId}
            closeSidebar={handleCloseEmailDialog}
            handleQuickApproveContent={mailData.handleQuickApproveContent}
            onRejectShowModal={() => { }}
            handleAssignEmailToLead={mailData.handleAssignEmailToLead}
          />
        </Dialog>
      )}
    </>
  );
};

export default EmailTab;
