'use client';

import { CustomToggle } from '@/components/shared/CustomToggle/CustomToggle';
import RoleGuard from '@/components/shared/RoleGuard';
import { Bank } from '@/services/SettingsService';
import { useBankUpdate } from '@/services/hooks/useBankUpdate';
import { formatLimitRange } from '@/utils/utils';
import { useAttachmentDisplayUrl } from '@/utils/hooks/useAttachmentDisplayUrl';
import { CountryFlagFromCode } from '@/components/shared/CountryFlagFromCode/CountryFlagFromCode';
import Image from 'next/image';
import { useCallback } from 'react';

type SimpleBankCardProps = {
  bank: Bank;
  batch?: boolean;
  user?: boolean;
  showCheckBox?: boolean;
};

export function SimpleBankCard({ bank, user = false, showCheckBox = false }: SimpleBankCardProps) {
  const { mutate, isPending } = useBankUpdate(bank._id || '');
  const logoDoc = bank.logo && typeof bank.logo === 'object' ? bank.logo : null;
  const countryFlagDoc = bank?.country_flag || bank?.bank_country_flag;
  const logoDisplayUrl = useAttachmentDisplayUrl(logoDoc);
  const countryFlagDisplayUrl = useAttachmentDisplayUrl(countryFlagDoc);

  const handleIsAllowToggle = useCallback(() => {
    const nextChecked = !(bank?.is_allow || false);
    mutate({ is_allow: nextChecked, state: nextChecked ? 'active' : 'stop' });
  }, [bank.is_allow, mutate]);

  const onStopPropagation = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  const formattedLimit = formatLimitRange(bank.min_limit, bank.max_limit);
  const hasLimitData = formattedLimit !== '-';

  return (
    <div className="flex w-full min-w-0 flex-nowrap justify-between gap-2 text-xs xl:text-sm">
      <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-hidden px-2 py-2 text-left">
        {/* Logo - square, rounded */}
        {bank.logo && (
          <div className="relative shrink-0 overflow-hidden rounded-sm border">
            <Image
              src={logoDisplayUrl || '/img/logo/logo-mini-black.png'}
              alt={bank?.name}
              width={24}
              height={24}
              className="h-6 w-6 min-w-4 object-contain"
            />
          </div>
        )}
        {/* Bank name - grey, truncates when space is limited. Dash only when name exists. Tooltip shows full bank name on hover */}
        <span className="min-w-0 shrink truncate" title={bank?.name ?? ''}>
          {bank.nickName?.trim() ? `${bank.nickName} -` : ''}
        </span>

        {/* Show when ISO code or legacy uploaded flag exists (code-only banks use flagcdn via CountryFlagFromCode) */}
        {(bank.bank_country_code?.trim() || bank.country_flag || bank.bank_country_flag) && (
          <div className="flex shrink-0 items-center" onClick={onStopPropagation}>
            <div className="relative shrink-0 overflow-hidden rounded-sm border">
              <CountryFlagFromCode
                countryCode={bank.bank_country_code}
                legacySrc={countryFlagDisplayUrl}
                alt={bank.name}
                width={24}
                height={24}
                className="h-auto w-6 min-w-4 overflow-hidden rounded-sm object-contain"
              />
            </div>
            {/* <span className="shrink-0 pl-1">{bank.bank_country_code}</span> */}
          </div>
        )}

        {hasLimitData && (
          <span
            className="min-w-0 shrink truncate  text-gray-900"
            title={`Limits: ${formattedLimit}`}
          >
            Limits: {formattedLimit}
          </span>
        )}
      </div>
      {/* Optional toggle row when !user - hide when showCheckBox (selection mode) is active */}
      {!user && !showCheckBox && (
        <div className="flex shrink-0 items-center gap-1 py-3 pr-1" onClick={onStopPropagation}>
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
        </div>
      )}
    </div>
  );
}

export default SimpleBankCard;
