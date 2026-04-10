/**
 * LeadHeader Component
 *
 * Enhanced navigation header for lead details with queue navigation support
 *
 * Features:
 * - Smart Previous/Next navigation with navigation chain support
 * - Visual indicators for queue position (Current Top, Pinned, View Count)
 * - Complete & Next button for pinned leads
 * - Backward compatible with old navigation system
 * - Wiedervorlage status progression
 * - Appointment display with edit functionality
 *
 * Navigation Props (New):
 * - navigation: Full navigation context from queue system
 * - uiHints: UI guidance for button visibility and endpoint routing
 * - onComplete: Callback for completing pinned leads
 *
 * Legacy Props (Backward Compatible):
 * - canGoToPrevious/canGoToNext: Boolean flags
 * - onPrevious/onNext: Simple navigation callbacks
 */

import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Tooltip from '@/components/ui/Tooltip';
import { TLead } from '@/services/LeadsService';

import React from 'react';

import BackButton from '@/app/(protected-pages)/dashboards/mails/_components/Shared/BackButton';

import CreateTaskPopover from '@/components/shared/CreateTaskPopover/CreateTaskPopover';
import OfferCallCounter from '../../../../../_components/OfferCallCounter';
import TicketCounter from '../../../../_components/v2/TicketCounter';
import TerminCounter from '../../LeadAdditionalInfo/components/TerminCounter';
import { useStatusActions } from '../../hooks/useStatusActions';
import { useWiedervorlage } from '../../hooks/useWiedervorlage';
import LeadAssignOrTransformButton from './LeadAssignOrTransformButton';
import LeadDeleteButton from './LeadDeleteButton';
import OutButton from './OutButton';
import ReclamationButton from './ReclamationButton';
import WiedervorlageButton from './WiedervorlageButton';
import {
  NEXT_NAV_CURRENT_TOP_TOOLTIP,
  NEXT_NAV_TOOLTIP,
  PREVIOUS_NAV_TOOLTIP,
  TOOLTIP_POPOVER_CLASS,
} from '@/utils/toltip.constants';

interface NavigationData {
  previous_lead_id?: string | null;
  has_previous?: boolean;
  next_lead_id?: string | null;
  has_next?: boolean;
  next_is_current_top?: boolean;
  is_current_top?: boolean;
  is_pinned?: boolean;
  can_complete?: boolean;
  view_count?: number;
  first_viewed_at?: string | null;
  last_viewed_at?: string | null;
}

interface UIHints {
  show_previous_button?: boolean;
  show_next_button?: boolean;
  show_complete_button?: boolean;
  show_back_to_current_button?: boolean;
  next_endpoint?: string | null;
  previous_endpoint?: string | null;
  complete_endpoint?: string | null;
}

interface LeadHeaderProps {
  currentPosition: number;
  totalUsers: number;
  canGoToPrevious: boolean;
  canGoToNext: boolean;
  isAdmin: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onDelete?: () => void;
  onComplete?: () => void;
  lead: TLead;
  assignment: any;
  hasActiveFilters?: boolean;
  filterState?: any;
  // New navigation props
  navigation?: NavigationData;
  uiHints?: UIHints;
  // Action props
  onStatusUpdated?: (stageId: string, statusId: string) => void;
  onReclamationClick?: () => void;
  onTransformSuccess?: () => void;
  onLeadAssignChanged?: () => void;
  disableAllButtons?: boolean;
  showInDialog?: boolean;
  taskTypeFromDialog?: string;
  offerIdFromDialog?: string;
  openingIdFromDialog?: string;
}

const LeadHeader = React.memo(
  ({
    currentPosition,
    totalUsers,
    canGoToPrevious,
    canGoToNext,
    onPrevious,
    onNext,
    onDelete,
    onComplete,
    lead,
    assignment,
    hasActiveFilters,
    filterState,
    navigation,
    uiHints,
    onStatusUpdated,
    onReclamationClick,
    onTransformSuccess,
    onLeadAssignChanged,
    disableAllButtons = false,
    showInDialog = false,
    taskTypeFromDialog,
    offerIdFromDialog,
    openingIdFromDialog,
  }: LeadHeaderProps) => {
    const { handleOut, handleReclamation, hasOutStatus } = useStatusActions({
      onReclamationClick,
      onStatusClick: onStatusUpdated
        ? (stageId, statusId) => onStatusUpdated(stageId, statusId)
        : undefined,
    });

    const {
      handleWiedervorlage,
      isDisabled: isWiedervorlageDisabled,
      wiedervorlageTooltip,
    } = useWiedervorlage({
      lead,
    });
    // const { data: allProjects } = useAllProjects({ limit: 100 });
    // Static duplicate agents data
    // const duplicateAgents = (lead as any)?.duplicate_leads || [];
    // const duplicateCount = duplicateAgents.length;

    const hasOffers = lead?.offers && lead.offers.length > 0;

    // Duplicate Indicator Component

    const taskType = taskTypeFromDialog || 'lead';

    return (
      <Card
        className={`relative rounded-none ${showInDialog ? 'overflow-visible' : ''}`}
        bodyClass={`flex items-center justify-between flex-wrap gap-2 ${showInDialog ? 'overflow-visible' : ''}`}
      >
        <div className="flex items-center gap-2">
          {!showInDialog && <BackButton />}

          <div className="flex items-center gap-2">
            <LeadAssignOrTransformButton
              assignment={assignment}
              lead={lead}
              leadId={String(lead?._id)}
              onTransformSuccess={onTransformSuccess}
              onLeadAssignChanged={onLeadAssignChanged}
            />
            {onDelete && <LeadDeleteButton onDelete={onDelete} lead={lead} />}

            {hasOffers ? (
              <div className="flex items-center gap-2">
                <OfferCallCounter
                  hidePlusBtn={true}
                  offerCalls={(lead as any)?.offer_calls || 0}
                  leadId={lead?._id}
                  showNEButton
                />
              </div>
            ) : (
              <WiedervorlageButton
                onClick={handleWiedervorlage}
                disabled={isWiedervorlageDisabled || disableAllButtons}
                tooltipTitle={wiedervorlageTooltip}
                tooltipHoverOnly={showInDialog}
              />
            )}

            {hasOutStatus && <OutButton onClick={handleOut} disabled={disableAllButtons} />}
            <ReclamationButton onClick={handleReclamation} disabled={disableAllButtons} />
          </div>
        </div>

        {/* Centered Termin and Tasks - Balanced positioning to avoid overlap on both sides */}
        <div className="absolute top-1/2 left-[75%] flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 lg:left-2/3 lg:left-[65%] xl:left-1/2 xl:left-[55%]">
          <TerminCounter appointments={lead?.appointments || []} leadId={String(lead?._id)} />

          <TicketCounter
            leadId={lead?._id !== undefined && lead?._id !== null ? String(lead._id) : undefined}
            // offerId={offerIdFromDialog}
            // openingId={openingIdFromDialog}
          />
          {lead?._id && (
            <div className="-ml-2 flex shrink-0 items-center">
              <CreateTaskPopover
                leadId={String(lead._id)}
                taskType={taskType}
                offerId={offerIdFromDialog}
                openingId={openingIdFromDialog}
              />
            </div>
          )}
          {!showInDialog && (
            <Button
              size="xs"
              variant="default"
              title="Sync"
              icon={<ApolloIcon name="refresh" className="h-4 w-4 shrink-0" />}
              gapClass="gap-0"
              className="h-5 w-5 !min-w-0 shrink-0 rounded-md !p-0 xl:!h-auto xl:!w-auto xl:!min-w-0 xl:!gap-1 xl:!px-1 xl:!py-0.5"
            >
              <span className="hidden xl:inline">Sync</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!showInDialog && (
            <div className="text-xs text-gray-500 lg:text-sm">
              {currentPosition}/{totalUsers}
              {hasActiveFilters && (
                <span
                  className="ml-2 cursor-help rounded bg-blue-100 px-2 py-1 text-xs text-blue-600"
                  title={
                    filterState
                      ? `Active filters: ${JSON.stringify(filterState, null, 2)}`
                      : 'Filters active'
                  }
                >
                  Filtered
                </span>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-1">
            {/* Previous Button - Enhanced with navigation data */}
            {!showInDialog && (
              <Tooltip
                title={PREVIOUS_NAV_TOOLTIP}
                placement="left"
                wrapperClass="inline-flex"
                className={TOOLTIP_POPOVER_CLASS}
              >
                <Button
                  onClick={onPrevious}
                  disabled={navigation ? !navigation?.has_previous : !canGoToPrevious}
                  icon={<ApolloIcon name="arrow-left" className="" />}
                  size="xs"
                  className="px-1 xl:px-2"
                  gapClass="gap-0"
                >
                  <span className="hidden xl:flex xl:ps-1">Previous</span>
                </Button>
              </Tooltip>
            )}

            {/* Queue Status Indicators */}
            {/* {navigation && (
              <div className="flex items-center gap-1 px-2">
                {navigation.is_current_top && (
                  <span
                    className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700"
                    title="This is the current top lead in your queue"
                  >
                    📍 Current
                  </span>
                )}
                {navigation.is_pinned && (
                  <span
                    className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700"
                    title="This lead is pinned (has active offers)"
                  >
                    📌 Pinned
                  </span>
                )}
                {navigation.view_count !== undefined && navigation.view_count > 1 && (
                  <span
                    className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600"
                    title={`You've viewed this lead ${navigation.view_count} times`}
                  >
                    👁️ {navigation.view_count}
                  </span>
                )}
              </div>
            )} */}

            {/* Complete & Next Button - Only for pinned leads at current top */}
            {navigation?.can_complete && navigation?.is_current_top && onComplete && (
              <Button
                variant="solid"
                onClick={onComplete}
                icon={<ApolloIcon name="check-circle" />}
                iconAlignment="end"
                className="bg-green-600 text-white hover:bg-green-700"
                title="Complete this lead and move to next in queue"
                size="xs"
              >
                <span className="hidden lg:flex">Complete & Next</span>
                <span className="md:hidden">Complete</span>
              </Button>
            )}

            {/* Next Button - Enhanced with smart routing */}
            {!showInDialog &&
              (navigation?.has_next || canGoToNext) &&
              !(navigation?.can_complete && navigation?.is_current_top) && (
                <Tooltip
                  title={
                    navigation?.next_is_current_top
                      ? NEXT_NAV_CURRENT_TOP_TOOLTIP
                      : NEXT_NAV_TOOLTIP
                  }
                  placement="top"
                  wrapperClass="inline-flex"
                  className={TOOLTIP_POPOVER_CLASS}
                >
                  <Button
                    onClick={onNext}
                    disabled={navigation ? !navigation?.has_next : !canGoToNext}
                    icon={<ApolloIcon name="arrow-right" />}
                    iconAlignment="end"
                    size="xs"
                    className="px-1 xl:px-2"
                    gapClass="gap-0"
                  >
                    <span className="hidden xl:flex xl:pe-1">
                      {navigation?.next_is_current_top ? 'Current Top' : 'Next'}
                    </span>
                  </Button>
                </Tooltip>
              )}
          </div>
        </div>
      </Card>
    );
  }
);

LeadHeader.displayName = 'LeadHeader';

export default LeadHeader;
