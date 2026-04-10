'use client';

import { BANK_STATE_BADGE_STYLES } from '@/app/(protected-pages)/admin/banks/_components/BANK_STATE_BADGE_STYLES';
import { CustomToggle } from '@/components/shared/CustomToggle/CustomToggle';
import RoleGuard from '@/components/shared/RoleGuard';
import { Bank } from '@/services/SettingsService';
import { useBankUpdate } from '@/services/hooks/useBankUpdate';
import classNames from '@/utils/classNames';
import { useAttachmentDisplayUrl } from '@/utils/hooks/useAttachmentDisplayUrl';
import Image from 'next/image';
import React, { useCallback } from 'react';

const BankCard = React.memo(
  ({
    bank,
    batch = true, // Intentionally unused for now (commented out in render)
    user = false,
  }: {
    bank: Bank;
    batch?: boolean;
    user?: boolean;
  }) => {
    void batch;
    const { mutate, isPending } = useBankUpdate(bank._id || '');
    const logoDoc = bank.logo && typeof bank.logo === 'object' ? bank.logo : null;
    const countryFlagDoc = bank.country_flag && typeof bank.country_flag === 'object' ? bank.country_flag : null;
    const logoDisplayUrl = useAttachmentDisplayUrl(logoDoc);
    const countryFlagDisplayUrl = useAttachmentDisplayUrl(countryFlagDoc);
    const handleIsAllowToggle = useCallback(() => {
      const nextChecked = !(bank.is_allow || false);
      mutate({ is_allow: nextChecked, state: nextChecked ? 'active' : 'stop' });
    }, [bank.is_allow, mutate]);

    const onStopPropagation = (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
    };

    // const copyLeiCode = useCallback(
    //   (e: React.MouseEvent) => {
    //     e.stopPropagation();
    //     const value = bank.lei_code?.trim();
    //     if (value) {
    //       navigator.clipboard.writeText(value);
    //       toast.push(<Notification title="Copied" type="success">LEI code copied to clipboard</Notification>);
    //     }
    //   },
    //   [bank.lei_code]
    // );

    return (
      <div className="flex justify-between gap-2 w-full">
        <div className="px-2 py-2 text-left">
          <div className="space-x-1 font-medium flex items-center gap-1">
            {bank.logo && <div className="rounded-sm overflow-hidden h-6 w-6 border relative"><Image src={logoDisplayUrl || '/img/logo/logo-mini-black.png'} alt={bank.name} fill className='object-cover' /></div>}
            <p className={classNames('rounded-xs px-1 capitalize', BANK_STATE_BADGE_STYLES[bank.state])}>
              {bank.name}
            </p>
            {bank.country_flag && (
              <div
                className="group flex items-center text-gray-500"
                onClick={onStopPropagation}
              >
                <div className="flex items-center gap-1 rounded-sm overflow-hidden">
                  <Image src={countryFlagDisplayUrl || '/img/logo/logo-mini-black.png'} className="min-w-4 h-6 w-auto" alt={bank.name} width={26} height={26} />
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2 text-xs mt-1">

            {/* <div className="flex items-center space-x-1">
              <label className="font-semibold">LEI:</label>
              <p
                role={bank.lei_code ? 'button' : undefined}
                title={bank.lei_code ? 'Click to copy' : undefined}
                onClick={bank.lei_code ? copyLeiCode : undefined}
                className={classNames(
                  'text-gray-500',
                  bank.lei_code && 'cursor-pointer hover:text-gray-700 select-none'
                )}
              >
                {bank.lei_code || '-'}
              </p>
            </div> */}
          </div>
        </div>
        <div className="group py-3 text-xs text-gray-500 pr-1">
          <p className="whitespace-nowrap text-right pr-1">
            Max: {bank.max_limit || '-'}
          </p>
          {!user && (
            <div
              className="flex items-center pt-1 text-xs text-gray-500"
              onClick={onStopPropagation}
            >
              <span className="pr-1 font-semibold">Allow & Stop:</span>
              <p className="items-right flex gap-1">
                <RoleGuard>
                  <div onClick={(e) => e.stopPropagation()} className="inline-block align-middle">
                    <CustomToggle
                      checked={bank.is_allow || false}
                      onChange={handleIsAllowToggle}
                      colorClass="bg-ocean-2"
                      disabled={isPending}
                    />
                  </div>
                </RoleGuard>
                {/* <span className="max-w-12 truncate">{bank.iban || 'N/A'}</span>
                {bank.iban && (
                  <CopyButton value={bank.iban} className="invisible group-hover:visible" />
                )} */}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for memo - only re-render if bank data changes
    return (
      prevProps.bank._id === nextProps.bank._id &&
      prevProps.bank.state === nextProps.bank.state &&
      prevProps.bank.name === nextProps.bank.name &&
      prevProps.bank.is_allow === nextProps.bank.is_allow &&
      prevProps.bank.swift_code === nextProps.bank.swift_code &&
      prevProps.bank.lei_code === nextProps.bank.lei_code &&
      prevProps.bank.iban === nextProps.bank.iban &&
      prevProps.bank.min_limit === nextProps.bank.min_limit &&
      prevProps.bank.max_limit === nextProps.bank.max_limit &&
      prevProps.bank.logo?._id === nextProps.bank.logo?._id &&
      prevProps.bank.logo?.public_url === nextProps.bank.logo?.public_url &&
      prevProps.bank.country_flag?._id === nextProps.bank.country_flag?._id &&
      prevProps.bank.country_flag?.public_url === nextProps.bank.country_flag?.public_url &&
      prevProps.batch === nextProps.batch &&
      prevProps.user === nextProps.user
    );
  }
);

BankCard.displayName = 'BankCard';

export default BankCard;
