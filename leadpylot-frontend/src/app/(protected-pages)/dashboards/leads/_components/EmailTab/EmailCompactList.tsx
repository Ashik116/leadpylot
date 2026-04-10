'use client';

import { useCallback, useMemo, useState } from 'react';
import { UpdatesActivitySkeletonGroup } from '../../[id]/_components/UpdatesActivitySkeleton';
import DocumentPreviewDialog from '@/components/shared/DocumentPreviewDialog';
import { useDocumentPreview } from '@/hooks/useDocumentPreview';
import ImagePreviewService from '@/server/ImagePreviewService';
import EmailExpanded from './EmailExpanded';
import EmailItemHeader from './EmailIteamHeader';
import NotFoundData from '../../[id]/_components/LeadAdditionalInfo/NotFoundData';

type EmailCompactListProps = {
  emailSystem: any;
};

export type Activity = {
  id: string;
  actor?: string;
  assigned_to?: string;
  timestamp?: string;
  project_id?: {
    name?: string;
  };
  direction?: 'incoming' | 'outgoing';
  details?: {
    subject?: string;
    content?: string;
    from?: string;
    from_address?: string;
    to?: string;
  };
  attachments?: Array<{ _id?: string; filename?: string; name?: string; size?: number }>;
  conversation?: {
    reply_count?: number;
  };
};

export default function EmailCompactList({ emailSystem }: EmailCompactListProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const documentPreview = useDocumentPreview();
  const { groupedEmailNotifications, emailNotificationsLoading, emailNotificationsError } =
    emailSystem ?? {};
  // Email notifications data available in groupedEmailNotifications
  const totalCount = useMemo(() => {
    const groups = groupedEmailNotifications || {};
    const values = Object?.values(groups) as unknown[];
    return values?.reduce((sum: number, items) => {
      const count = Array?.isArray(items) ? items?.length : 0;
      return sum + count;
    }, 0);
  }, [groupedEmailNotifications]);
  const orderedGroups = useMemo(() => {
    return Object?.entries(groupedEmailNotifications || {}).sort(
      ([a], [b]) => new Date(b).getTime() - new Date(a).getTime()
    );
  }, [groupedEmailNotifications]);

  const handleToggle = useCallback(
    (id: string) => {
      setOpenId((prev) => (prev === id ? null : id));
    },
    [setOpenId]
  );

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

  if (!orderedGroups?.length) {
    return (
      <NotFoundData message="No emails available for this lead." />
    );
  }

  return (
    <div className="h-[500px] overflow-y-auto rounded-xl border border-gray-200 bg-white/80 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60">
      {/* Header / Summary */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-gray-100 bg-white/80 px-4 py-2 text-xs text-gray-600 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 font-medium text-gray-700">
            Emails
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700 ring-1 ring-gray-200 ring-inset">
              {totalCount}
            </span>
          </span>
          <span className="hidden h-3 w-px bg-gray-200 sm:block" />
          <span className="hidden items-center gap-2 text-[11px] text-gray-500 sm:flex">
            <span className="inline-flex items-center gap-1">
              <span className="bg-new h-2 w-2 rounded-full" /> Incoming
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-sky-400" /> Outgoing
            </span>
          </span>
        </div>
        <span className="text-[11px] text-gray-400">Click a row to expand</span>
      </div>

      {orderedGroups?.length > 0 &&
        orderedGroups?.map(([date, activities]) => (
          <div key={date} className="border-b border-gray-100 last:border-b-0">
            {/* Date Header - Gmail style */}
            <div className="sticky top-8 z-10 bg-gradient-to-b from-white/95 to-white/70 px-4 py-2 backdrop-blur-sm">
              <h3 className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-wide text-gray-600 uppercase">
                <span className="h-2 w-2 rounded-full bg-gray-300" />
                {new Date(date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
            </div>
            <div className="divide-y divide-gray-100" role="list">
              {(Array?.isArray(activities) ? activities : [])?.map((activity: Activity) => {
                const isOpen = openId === activity?.id;

                return (
                  <div
                    key={activity.id}
                    role="listitem"
                    className={`group relative bg-white transition-colors focus-within:bg-gray-50/60 hover:bg-gray-50/60 ${isOpen ? 'bg-gray-50/60' : ''
                      } ${activity?.direction === 'incoming'
                        ? 'border-l-new/70 border-l-2'
                        : 'border-l-2 border-l-sky-400/70'
                      }`}
                  >
                    <EmailItemHeader
                      activity={activity}
                      isOpen={isOpen}
                      onToggle={() => handleToggle(activity.id)}
                      onAttachmentClick={(attachment) =>
                        ImagePreviewService({ attachment, usePreviewHook: documentPreview })
                      }
                    />
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-out ${isOpen ? 'opacity-100' : 'max-h-0 opacity-0'
                        }`}
                    >
                      <div className="border-t border-gray-100">
                        <div
                          className={`transition-all duration-300 ease-out ${isOpen
                            ? 'translate-y-0 transform opacity-100'
                            : '-translate-y-2 transform opacity-0'
                            }`}
                        >
                          {isOpen && (
                            <EmailExpanded
                              activityId={activity.id}
                              onAttachmentClick={(attachment) =>
                                ImagePreviewService({ attachment, usePreviewHook: documentPreview })
                              }
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      <DocumentPreviewDialog {...documentPreview.dialogProps} title="Email Attachment Preview" />
    </div>
  );
}
