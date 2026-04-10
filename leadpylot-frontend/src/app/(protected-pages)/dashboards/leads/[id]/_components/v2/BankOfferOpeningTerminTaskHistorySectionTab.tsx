import OpeningMenuIcon from '@/assets/svg/menu-icons/OpeningMenuIcon';
import RoleGuard from '@/components/shared/RoleGuard';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import Card from '@/components/ui/Card';
import Tabs from '@/components/ui/Tabs';
import TabContent from '@/components/ui/Tabs/TabContent';
import TabList from '@/components/ui/Tabs/TabList';
import TabNav from '@/components/ui/Tabs/TabNav';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useAuth } from '@/hooks/useAuth';
import { useOffersProgress, useOpeningById } from '@/services/hooks/useOffersProgress';
import { useProject } from '@/services/hooks/useProjects';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import BankList from '../LeadAdditionalInfo/BankList';
import OffersTable from '../LeadAdditionalInfo/OffersTable';
import OutOffersTable from '../LeadAdditionalInfo/OutOffersTable';
import { OpeningDetailsViewForLead } from '../LeadAdditionalInfo/components/OpeningDetailsViewForLead';
import OpeningTableLeadDetails from '../LeadAdditionalInfo/components/OpeningTableLeadDetails';
import { useLeadDetailsContext } from '../LeadDetailsContext';
import { useLeadProjectAgent } from '../hooks/useLeadProjectAgent';
import { useLeadDetailsBulkActions } from './LeadDetailsBulkActionsContext';
import {
  LeadDetailsColumnCustomizationProvider,
  useLeadDetailsColumnCustomization,
} from './LeadDetailsColumnCustomizationContext';

const OFFERS_PLUS_TOOLTIP_ENABLED =
  'Create offer (+): opens the flow to add a new offer for this lead in the table below.';

const OFFERS_PLUS_TOOLTIP_DISABLED =
  'Create offer needs both a project and an agent assigned on this lead before you can add another offer.';

const SEND_EMAIL_HEADER_TOOLTIP =
  'Send Email: opens the email composer for this lead so you can write a message and attach selected offers in sending order before sending.';

const COLUMN_CUSTOMIZE_TOOLTIP =
  'Customize columns: choose which columns appear in the offers table for this lead view (admins only).';

const TabBadge = ({ count }: { count: number }) => (
  <span className="bg-ocean-2/10 text-ocean-2 flex size-4 items-center justify-center rounded-full text-[10px]">
    {count}
  </span>
);

interface BankOfferOpeningTerminTaskHistorySectionTabProps {
  selectedOpeningId?: string | null;
  setSelectedOpeningId?: (id: string | null) => void;
  setSelectedOfferId?: (id: string | null) => void;
  openingsData?: { data?: any[]; meta?: { total?: number; page?: number; limit?: number } };
  onOpenComposeEmail?: () => void;
}

const TabRowColumnCustomizationButton = () => {
  const ctx = useLeadDetailsColumnCustomization();
  if (!ctx) return null;
  const { customizeButtonRef } = ctx;
  return (
    <RoleGuard role={Role.ADMIN}>
      <Tooltip
        title={COLUMN_CUSTOMIZE_TOOLTIP}
        placement="top"
        wrapperClass="inline-flex"
        className="max-w-sm! text-xs leading-snug"
      >
        <Button
          ref={customizeButtonRef}
          className="h-6.5 w-6.5 shrink-0"
          variant="plain"
          icon={<ApolloIcon name="sliders-settings" className="text-md leading-none font-bold" />}
          onClick={() => ctx.openColumnCustomization()}
          size="xs"
          aria-label="Customize offer table columns"
        />
      </Tooltip>
    </RoleGuard>
  );
};

const BankOfferOpeningTerminTaskHistorySectionTab = ({
  selectedOpeningId,
  setSelectedOpeningId,
  setSelectedOfferId,
  openingsData: openingsDataProp,
  onOpenComposeEmail,
}: BankOfferOpeningTerminTaskHistorySectionTabProps) => {
  const {
    lead,
    showInDialog,
    highlightedOfferId,
    highlightedOpeningId,
    defaultActiveTab,
    initialSelectedOpeningId,
    handleAddOpeningClick,
    onOfferClick,
    onEditOffer,
  } = useLeadDetailsContext();

  const { hasRole } = useAuth();
  const isAdmin = hasRole(Role.ADMIN);

  const searchParams = useSearchParams();
  const detailsTypeParam = (searchParams.get('detailsType') || '').toLowerCase();
  const detailsIdParam = searchParams.get('detailsId');
  const shouldApplyDetails =
    !!detailsIdParam && (detailsTypeParam === 'offer' || detailsTypeParam === 'opening');
  const detailsType = shouldApplyDetails ? detailsTypeParam : null;
  const detailsId = shouldApplyDetails ? detailsIdParam : null;
  const highlightedOfferIdFromDetails = detailsType === 'offer' ? detailsId : null;
  const highlightedOfferIdFromOpeningDetails =
    showInDialog && detailsType === 'opening' ? detailsId : null;
  const effectiveHighlightedOfferId =
    highlightedOfferId ||
    highlightedOfferIdFromDetails ||
    highlightedOfferIdFromOpeningDetails ||
    undefined;
  const effectiveHighlightedOpeningId =
    highlightedOpeningId || (detailsType === 'opening' ? detailsId : null) || undefined;

  const [isOffersExpanded, setIsOffersExpanded] = useState(true);
  const [isBankExpanded, setIsBankExpanded] = useState(true);
  const requestedActiveTab =
    defaultActiveTab || (shouldApplyDetails && detailsType === 'opening' ? 'openings' : 'offers');
  const [activeTab, setActiveTab] = useState<
    'offers' | 'out-offers' | 'openings' | 'tasks' | 'history'
  >(requestedActiveTab as any);

  useEffect(() => {
    if (!requestedActiveTab) return;
    setTimeout(() => {
      setActiveTab(requestedActiveTab);
    }, 0);
  }, [requestedActiveTab]);

  useEffect(() => {
    const requestedSelectedOpeningId =
      initialSelectedOpeningId || (shouldApplyDetails && detailsId ? detailsId : null);
    if (!requestedSelectedOpeningId) return;
    setSelectedOpeningId?.(requestedSelectedOpeningId);
  }, [detailsId, initialSelectedOpeningId, shouldApplyDetails, setSelectedOpeningId]);

  // Counts fetching
  const projectId = (lead as any)?.project?.[0]?._id;
  const { data: projectData } = useProject(projectId, !!projectId);
  const totalBanks = (projectData as any)?.banks?.length || 0;

  const { data: openingsDataFetched } = useOffersProgress({
    search: lead._id,
    has_progress: 'all',
    page: 1,
    limit: 80,
    enabled: !openingsDataProp,
  });
  const openingsData = openingsDataProp ?? openingsDataFetched;
  const pinnedOpeningLookupId =
    (detailsType === 'offer' ? detailsId : null) ||
    (defaultActiveTab === 'offers' ? highlightedOfferId : null);
  const shouldFetchPinnedOpening = !!pinnedOpeningLookupId && !!showInDialog;
  const { data: pinnedOpening } = useOpeningById(
    shouldFetchPinnedOpening ? String(pinnedOpeningLookupId) : undefined,
    shouldFetchPinnedOpening
  );

  const totalOpenings = openingsData?.meta?.total || 0;

  const { isOfferDisabled } = useLeadProjectAgent(lead as any);

  const outOffers =
    (lead as any)?.offers?.filter((offer: any) => offer.current_stage === 'out') || [];

  const notOutOffers = (lead as any)?.offers?.filter(
    (offer: any) => offer?.current_stage !== 'out'
  );

  return (
    <LeadDetailsColumnCustomizationProvider>
      <Card
        className="z-10"
        bodyClass={`space-y-2  ${showInDialog ? 'max-h-[67dvh] overflow-y-auto pb-8' : ''}`}
      >
        <Tabs
          value={activeTab}
          onChange={(value) => setActiveTab(value as typeof activeTab)}
          className="flex flex-col gap-0"
        >
          <div className="flex items-center justify-between border-b">
            <div className="flex flex-1 items-center gap-2">
              <TabList>
                <TabNav className="px-2 text-sm text-nowrap" value="offers">
                  <div className="flex items-center gap-[2px] lg:gap-1">
                    <ApolloIcon name="file-alt" className="text-sm" />
                    <span className="hidden lg:inline">Offers</span>
                    <span className="font-medium lg:hidden"> Off</span>
                    <TabBadge count={notOutOffers?.length || 0} />
                  </div>
                </TabNav>
                {/* + icon - beside Offers tab, same style as Meetings + icon */}
                <Tooltip
                  title={isOfferDisabled ? OFFERS_PLUS_TOOLTIP_DISABLED : OFFERS_PLUS_TOOLTIP_ENABLED}
                  placement="top"
                  wrapperClass="inline-flex"
                  className="max-w-sm! text-xs leading-snug"
                >
                  <span className="inline-flex">
                    <Button
                      variant="plain"
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOfferClick?.();
                      }}
                      disabled={isOfferDisabled}
                      className="flex size-5 shrink-0 items-center justify-center rounded-md bg-gray-100 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Create Offer"
                      icon={<ApolloIcon name="plus" className="text-xs leading-0" />}
                    />
                  </span>
                </Tooltip>{' '}
                <TabNav className="px-2 text-sm text-nowrap" value="out-offers">
                  <div className="flex items-center gap-[2px] lg:gap-1">
                    <ApolloIcon name="log-out" className="text-sm" />
                    <span className="hidden lg:inline">Out Offers</span>
                    <span className="font-medium lg:hidden"> Out</span>
                    <TabBadge count={outOffers?.length || 0} />
                  </div>
                </TabNav>
                <TabNav className="px-2 text-sm text-nowrap" value="openings">
                  <div className="flex items-center gap-[2px] lg:gap-1">
                    <OpeningMenuIcon />
                    <span className="hidden lg:inline">Openings</span>
                    <span className="font-medium lg:hidden"> Opn</span>
                    <TabBadge count={totalOpenings} />
                  </div>
                </TabNav>{' '}
              </TabList>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Tooltip
                title={SEND_EMAIL_HEADER_TOOLTIP}
                placement="top"
                wrapperClass="inline-flex"
                className="max-w-sm! text-xs leading-snug"
              >
                <Button
                  variant="plain"
                  size="xs"
                  icon={<ApolloIcon name="mail" className="text-sm leading-0" />}
                  onClick={() => onOpenComposeEmail?.()}
                >
                  Send Email
                </Button>
              </Tooltip>
              {/* Column customization icon - right side of tab row */}
              {isOffersExpanded && <TabRowColumnCustomizationButton />}
            </div>
            {showInDialog && (
              <Button
                className="mr-1 mb-1 px-1 hover:cursor-pointer"
                onClick={() => setIsOffersExpanded(!isOffersExpanded)}
                variant="plain"
                size="xs"
              >
                <ApolloIcon
                  name={isOffersExpanded ? 'chevron-arrow-up' : 'chevron-arrow-down'}
                  className="text-lg text-black"
                />
              </Button>
            )}
          </div>

          {/* ActionButtonsSection slot - between tab area and table (not beside tabs) */}
          <div id="lead-details-action-bar-slot" className="min-h-0 pt-1" />

          {isOffersExpanded && (
            <LeadDetailsTabContent
              activeTab={activeTab}
              isOfferDisabled={isOfferDisabled}
              showInDialog={showInDialog}
              isAdmin={isAdmin}
              onOfferClick={onOfferClick}
              openingsData={openingsData}
              pinnedOpening={pinnedOpening}
              onViewOpening={(openingId, offerId) => {
                setSelectedOpeningId?.(openingId);
                setSelectedOfferId?.(offerId ?? null);
              }}
              effectiveHighlightedOpeningId={effectiveHighlightedOpeningId}
              selectedOpeningId={selectedOpeningId}
              leadId={lead?._id}
              onEditOffer={onEditOffer}
              setSelectedOpeningId={setSelectedOpeningId}
              setSelectedOfferId={setSelectedOfferId}
              totalOpenings={totalOpenings}
            />
          )}
        </Tabs>
        <Tabs defaultValue="banks">
          <div className="flex items-center justify-between border-b">
            <TabList className="flex-1">
              <TabNav className="text-sm text-nowrap" value="banks">
                <div className="flex items-center gap-1">
                  <ApolloIcon name="company" className="text-sm" />
                  <span>Bank</span>
                  <TabBadge count={totalBanks} />
                </div>
              </TabNav>
            </TabList>
            {showInDialog && (
              <Button
                className="mr-1 mb-1 px-1 hover:cursor-pointer"
                onClick={() => setIsBankExpanded(!isBankExpanded)}
                variant="plain"
                size="xs"
              >
                <ApolloIcon
                  name={isBankExpanded ? 'chevron-arrow-up' : 'chevron-arrow-down'}
                  className="text-lg text-black"
                />
              </Button>
            )}
          </div>
          {isBankExpanded && (
            <TabContent value="banks">
              <BankList lead={lead as any} />
            </TabContent>
          )}
        </Tabs>
      </Card>
    </LeadDetailsColumnCustomizationProvider>
  );
};

export default BankOfferOpeningTerminTaskHistorySectionTab;

function LeadDetailsTabContent({
  activeTab,
  isOfferDisabled,
  showInDialog,
  isAdmin,
  onOfferClick,
  openingsData,
  pinnedOpening,
  onViewOpening,
  effectiveHighlightedOpeningId,
  selectedOpeningId,
  leadId,
  onEditOffer,
  setSelectedOpeningId,
  setSelectedOfferId,
  totalOpenings,
}: {
  activeTab: string;
  isOfferDisabled: boolean;
  showInDialog?: boolean;
  isAdmin: boolean;
  onOfferClick?: () => void;
  openingsData: any;
  pinnedOpening: any;
  onViewOpening: (openingId: string, offerId?: string) => void;
  effectiveHighlightedOpeningId?: string;
  selectedOpeningId?: string | null;
  leadId: string;
  onEditOffer?: (offer: any) => void;
  setSelectedOpeningId?: (id: string | null) => void;
  setSelectedOfferId?: (id: string | null) => void;
  totalOpenings: number;
}) {
  const { selectionResetKey } = useLeadDetailsBulkActions();
  const columnCtx = useLeadDetailsColumnCustomization();
  return (
    <>
      <TabContent value="offers" className="relative pt-0">
        <OffersTable
          actionBarPortalTargetId={
            activeTab === 'offers' ? 'lead-details-action-bar-slot' : undefined
          }
          headerActionsPortalTargetId={
            activeTab === 'offers' ? 'lead-details-header-actions-slot' : undefined
          }
          onRegisterColumnCustomization={columnCtx?.register}
          externalCustomizeButtonRef={columnCtx?.customizeButtonRef}
          selectionResetKey={selectionResetKey}
          leftAction={undefined}
        />
      </TabContent>
      <TabContent value="out-offers" className="relative pt-0">
        <OutOffersTable
          actionBarPortalTargetId={
            activeTab === 'out-offers' ? 'lead-details-action-bar-slot' : undefined
          }
          headerActionsPortalTargetId={
            activeTab === 'out-offers' ? 'lead-details-header-actions-slot' : undefined
          }
          onRegisterColumnCustomization={columnCtx?.register}
          externalCustomizeButtonRef={columnCtx?.customizeButtonRef}
          selectionResetKey={selectionResetKey}
        />
      </TabContent>
      <TabContent value="openings" className="relative pt-0">
        <OpeningTableLeadDetails
          actionBarPortalTargetId={
            activeTab === 'openings' ? 'lead-details-action-bar-slot' : undefined
          }
          headerActionsPortalTargetId={
            activeTab === 'openings' ? 'lead-details-header-actions-slot' : undefined
          }
          onRegisterColumnCustomization={columnCtx?.register}
          externalCustomizeButtonRef={columnCtx?.customizeButtonRef}
          selectionResetKey={selectionResetKey}
          leadId={leadId}
          openingsData={openingsData}
          pinnedOpening={pinnedOpening}
          onViewOpening={onViewOpening}
          highlightedOpeningId={effectiveHighlightedOpeningId}
          selectedOpeningId={selectedOpeningId || undefined}
          showInDialog={showInDialog}
        />

        {/* Only show Opening Details when the Openings table has at least one row */}
        {selectedOpeningId && totalOpenings > 0 && (
          <OpeningDetailsViewForLead
            openingId={selectedOpeningId}
            onBack={() => {
              setSelectedOpeningId?.(null);
              setSelectedOfferId?.(null);
            }}
            onEdit={onEditOffer}
          />
        )}
      </TabContent>
    </>
  );
}
