'use client';
import React from 'react';
import Card from '@/components/ui/Card';
import Tabs from '@/components/ui/Tabs';
import { useTabs } from '@/components/ui/Tabs/context';
import TabContent from '@/components/ui/Tabs/TabContent';
import TabList from '@/components/ui/Tabs/TabList';
import TabNav from '@/components/ui/Tabs/TabNav';
import BankList from '../[id]/_components/LeadAdditionalInfo/BankList';
import OffersTable from '../[id]/_components/LeadAdditionalInfo/OffersTable';
import EmailCompactList from './EmailTab/EmailCompactList';
import DocumentList from '../[id]/_components/DocumentList';
import HistoryTable from '../[id]/_components/LeadAdditionalInfo/HistoryTable';
import { Lead } from '../projects/Type.Lead.project';
import { useNewEmailSystem } from '../[id]/_components/RightSidebar/useNewEmailSystem';
import { EmailSyncComponent } from '@/components/shared/EmailSyncComponent';
import { useSession } from '@/hooks/useSession';
import { Role } from '@/configs/navigation.config/auth.route.config';

const EmailSyncHeader = ({
  leadId,
  lead,
  isAdmin,
}: {
  leadId: string;
  lead: Lead;
  isAdmin: boolean;
}) => {
  const { value } = useTabs();
  if (value !== 'email' || !isAdmin) return null;
  return (
    <div className="ml-4">
      <EmailSyncComponent
        leadId={leadId}
        leadName={(lead as any)?.contact_name || 'Unknown Lead'}
        currentProjectId={(lead as any)?.project_id}
        currentProjectName={(lead as any)?.project_name}
        variant="card"
        showStatus={true}
        className="text-xs"
      />
    </div>
  );
};

const LeadsInformationTab = ({
  lead,
  highlightedOfferId,
  handleAddOpeningClick,
}: {
  lead: Lead;
  highlightedOfferId?: string;
  handleAddOpeningClick?: () => void;
}) => {
  const leadId = lead?._id;
  const emailSystem = useNewEmailSystem(leadId);
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === Role.ADMIN;

  return (
    <Card className="z-10 mt-2" bodyClass="p-2">
      <Tabs defaultValue={(lead as any)?.offers?.length > 0 ? 'offers' : 'banks'}>
        <div className="mb-4 flex items-center justify-between border-b">
          <TabList className="flex-1">
            <TabNav className="text-sm text-nowrap md:text-base" value="banks">
              Bank List
            </TabNav>
            <TabNav className="text-sm text-nowrap md:text-base" value="offers">
              Offers & Openings
              {highlightedOfferId && (
                <span className="bg-ocean-2 ml-2 animate-pulse rounded-full px-2 py-1 text-xs text-white">
                  New
                </span>
              )}
            </TabNav>
            <TabNav className="text-sm text-nowrap md:text-base" value="documents">
              Documents
            </TabNav>
            <TabNav className="text-sm text-nowrap md:text-base" value="history">
              History
            </TabNav>
            <TabNav className="text-sm text-nowrap md:text-base" value="email">
              Email{' '}
              {emailSystem?.totalUnseenEmails > 0 && (
                <div className="bg-ocean-3/40 ml-2 flex items-center justify-between rounded-full px-2 py-1">
                  <div className="text-ocean-2 flex items-center gap-2 text-xs">
                    <div className="bg-ocean-2 h-2 w-2 rounded-full"></div>

                    <span className="text-xs">New</span>
                    <span className="text-xs">{emailSystem?.totalUnseenEmails}</span>
                  </div>
                </div>
              )}
            </TabNav>
          </TabList>

          <EmailSyncHeader leadId={leadId} lead={lead} isAdmin={isAdmin} />
        </div>
        <TabContent value="banks">
          <BankList lead={lead as any} />
        </TabContent>
        <TabContent value="offers">
          <OffersTable
            lead={lead as any}
            handleAddOpeningClick={handleAddOpeningClick}
            highlightedOfferId={highlightedOfferId}
          />
        </TabContent>
        <Tabs.TabContent value="email">
          <EmailCompactList emailSystem={emailSystem} />
        </Tabs.TabContent>
        <TabContent value="documents">
          <DocumentList lead={lead} />
        </TabContent>
        <TabContent value="history">
          <HistoryTable lead={lead as any} />
        </TabContent>
      </Tabs>
    </Card>
  );
};

export default LeadsInformationTab;
