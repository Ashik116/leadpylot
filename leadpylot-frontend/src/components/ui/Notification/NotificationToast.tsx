'use client';

import React, { useCallback, useState } from 'react';
import classNames from 'classnames';
import useTimeout from '../hooks/useTimeout';
import { HiX } from 'react-icons/hi';
import { getNotificationConfig } from '@/configs/notification.config';
import { getAgentColor } from '@/utils/utils';
import type { MouseEvent, Ref } from 'react';

export interface NotificationToastProps {
  notificationType?: string;
  title?: string;
  message?: string;
  metadata?: Record<string, any>;
  actorName?: string;
  duration?: number;
  onClose?: (e: MouseEvent<any>) => void;
  onClick?: () => void;
  triggerByToast?: boolean;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

// ============================================
// DETAIL FIELD COMPONENT
// ============================================

const DetailPill = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1 min-w-0 max-w-full">
      <span className="shrink-0 text-[9px] font-semibold text-gray-400 uppercase">{label}</span>
      <span className={classNames('truncate text-[11px]', bold ? 'font-semibold text-gray-800' : 'text-gray-600')}>{value}</span>
    </span>
  );
};

// ============================================
// TYPE-SPECIFIC DETAIL RENDERERS
// ============================================

function renderEmailDetails(meta: Record<string, any>) {
  const subject = meta.subject || '';
  const from = meta.from_address || meta.from || '';
  const leadName = meta.leadName || meta.lead_name || '';
  const projectName = meta.projectName || meta.project_name || '';
  const partnerId = meta.partnerId || meta.partner_id || meta.partnerNo || meta.partner_no || '';

  if (!subject && !from && !leadName) return null;

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-gray-50 px-2.5 py-1.5">
      {subject && <DetailPill label="Subj" value={subject} bold />}
      {from && <DetailPill label="From" value={from} />}
      {leadName && <DetailPill label="Lead" value={leadName} bold />}
      {projectName && <DetailPill label="Project" value={projectName} />}
      {partnerId && <DetailPill label="#" value={partnerId} bold />}
    </div>
  );
}

function renderOfferDetails(meta: Record<string, any>) {
  const leadName = meta.leadName || meta.lead_name || '';
  const amount = meta.amount || '';
  const interestRate = meta.interestRate || meta.interest_rate || '';
  const bonus = meta.bonus || meta.bonusAmount || '';
  const bank = meta.bank || meta.bankName || meta.bank_name || '';

  if (!leadName && !amount && !bank) return null;

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-gray-50 px-2.5 py-1.5">
      {leadName && <DetailPill label="Lead" value={leadName} bold />}
      {amount && <DetailPill label="Amt" value={amount} bold />}
      {interestRate && <DetailPill label="Rate" value={interestRate} />}
      {bonus && <DetailPill label="Bonus" value={bonus} bold />}
      {bank && <DetailPill label="Bank" value={bank} />}
    </div>
  );
}

function renderLeadDetails(meta: Record<string, any>) {
  const leadName = meta.leadName || meta.lead_name || '';
  const partnerId = meta.partnerId || meta.partner_id || meta.partnerNo || meta.partner_no || '';
  const projectName = meta.projectName || meta.project_name || '';

  if (!leadName && !partnerId) return null;

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-gray-50 px-2.5 py-1.5">
      {leadName && <DetailPill label="Lead" value={leadName} bold />}
      {partnerId && <DetailPill label="#" value={partnerId} bold />}
      {projectName && <DetailPill label="Project" value={projectName} />}
    </div>
  );
}

function renderPaymentDetails(meta: Record<string, any>) {
  const leadName = meta.leadName || meta.lead_name || '';
  const amount = meta.amount || '';
  const bank = meta.bank || meta.bankName || meta.bank_name || '';

  if (!leadName && !amount) return null;

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-gray-50 px-2.5 py-1.5">
      {leadName && <DetailPill label="Lead" value={leadName} bold />}
      {amount && <DetailPill label="Amt" value={amount} bold />}
      {bank && <DetailPill label="Bank" value={bank} />}
    </div>
  );
}

/**
 * Pick the right detail renderer based on notification type
 */
function renderDetails(type: string, meta: Record<string, any>) {
  switch (type) {
    case 'offer_created':
    case 'opening_created':
      return renderOfferDetails(meta);

    case 'confirmation_created':
    case 'payment_voucher_created':
    case 'netto1_created':
    case 'netto2_created':
      return renderPaymentDetails(meta);

    case 'lead_assigned':
    case 'lead_assignment_admin':
    case 'lead_transferred':
    case 'bulk_lead_transferred':
    case 'project_assigned':
      return renderLeadDetails(meta);

    case 'email':
    case 'email_received':
    case 'email_system_received':
    case 'email_approved':
    case 'email_agent_assigned':
    case 'email_comment_mention':
    case 'email_comment_added':
      return renderEmailDetails(meta);

    default:
      return null;
  }
}

// ============================================
// COMPONENT
// ============================================

const NotificationToast: React.FC<NotificationToastProps> = ({
  notificationType = 'default',
  title,
  message,
  metadata = {},
  actorName,
  duration = 5000,
  onClose,
  onClick,
  triggerByToast,
  className,
  ref,
}) => {
  const [display, setDisplay] = useState<'show' | 'hiding' | 'hide'>('show');

  // TEMPORARY: Log on render
  console.log('🔔 NotificationToast rendering:', {
    notificationType,
    title,
    message,
    metadata,
    actorName,
    duration,
    display,
    triggerByToast,
  });

  const config = getNotificationConfig(notificationType);
  const Icon = config.ui.icon;
  const iconColor = config.ui.color;
  const iconBgColor = config.ui.bgColor;
  const displayTitle = title || config.label;

  const { clear } = useTimeout(onClose as () => void, duration, duration > 0);

  const handleClose = useCallback(
    (e: MouseEvent<any>) => {
      console.log('❌ NotificationToast close triggered');
      e.stopPropagation();
      setDisplay('hiding');
      clear();
      onClose?.(e);
      if (!triggerByToast) {
        setTimeout(() => setDisplay('hide'), 200);
      }
    },
    [onClose, clear, triggerByToast]
  );

  const handleCardClick = useCallback(
    (e: MouseEvent<any>) => {
      console.log('🖱️ NotificationToast clicked');
      onClick?.();
      handleClose(e);
    },
    [onClick, handleClose]
  );

  if (display === 'hide') {
    console.log('🚫 NotificationToast not rendering (display=hide)');
    return null;
  }

  const detailBlock = renderDetails(notificationType, metadata);

  return (
    <div
      ref={ref}
      onClick={handleCardClick}
      className={classNames(
        'relative w-[380px] cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-md transition-all duration-200',
        'hover:shadow-lg',
        display === 'hiding' && 'opacity-0 scale-95',
        className
      )}
    >
      {/* Top-right: agent name + close button */}
      <div className="absolute right-2 top-2.5 flex items-center gap-2">
        {actorName && (
          <span className={classNames('text-[11px] font-semibold', getAgentColor(actorName))}>
            {actorName}
          </span>
        )}
        <button
          onClick={handleClose}
          className="rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <HiX className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex gap-3 pr-4">
        {/* Icon */}
        <div
          className={classNames(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            iconBgColor
          )}
        >
          <Icon className={classNames('h-4 w-4', iconColor)} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Title row */}
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-gray-900">{displayTitle}</span>
            <span className="text-[10px] text-gray-400">now</span>
          </div>

          {/* Message -- only show if no detail block (avoids redundant text) */}
          {message && !detailBlock && (
            <p className="mt-0.5 text-xs leading-relaxed text-gray-600 line-clamp-2">{message}</p>
          )}

          {/* Structured detail block */}
          {detailBlock}
        </div>
      </div>
    </div>
  );
};

export default NotificationToast;
