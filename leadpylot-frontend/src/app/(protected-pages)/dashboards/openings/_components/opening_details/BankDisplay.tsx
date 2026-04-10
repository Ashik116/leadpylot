'use client';

import React from 'react';
import { useAttachmentPreviewFile } from '@/utils/hooks/useAttachMentPreviewFile';
import Image from 'next/image';

const BankDisplay = ({ bank }: { bank: any }) => {
  const bankName = bank?.nickName || bank?.bank_id?.bank_name || bank?.name || bank?.bank_id?.name;
  const countryFromBank = bank?.country || bank?.bank_id?.country;
  // Backward compatibility: parse "Name | Country" from name if country is missing
  let name: string;
  let country: string | undefined;
  if (countryFromBank) {
    name = bankName || '-';
    country = countryFromBank;
  } else if (bankName && bankName.includes('|')) {
    const parts = bankName.split('|').map((p: string) => p.trim());
    name = parts[0];
    country = parts[1];
  } else {
    name = bankName || '-';
    country = undefined;
  }

  const logoId = bank?.logo?._id || bank?.bank_id?.logo?._id;
  const flagId =
    bank?.bank_country_flag?._id ||
    bank?.country_flag?._id ||
    bank?.bank_id?.bank_country_flag?._id ||
    bank?.bank_id?.country_flag?._id;

  const logoIdClean =
    logoId && typeof logoId === 'string' && logoId.trim() !== '' ? logoId : undefined;
  const flagIdClean =
    flagId && typeof flagId === 'string' && flagId.trim() !== '' ? flagId : undefined;

  const logoBlobUrl = useAttachmentPreviewFile(logoIdClean)?.blobUrl || null;
  const flagBlobUrl = useAttachmentPreviewFile(flagIdClean)?.blobUrl || null;
  if (!name || name === '-') return <span>-</span>;

  return (
    <div className="flex flex-wrap items-center gap-2 py-0.5">
      <div className="flex items-center gap-1.5 rounded px-1.5 py-0.5">
        {logoBlobUrl && (
          <Image
            src={logoBlobUrl}
            alt={name}
            className="h-3.5 w-3.5 rounded-sm object-contain"
            width={14}
            height={14}
          />
        )}
        <span className="text-sm whitespace-nowrap text-black">{name}</span>
      </div>
      {(country || flagBlobUrl) && (
        <>
          <div className="mx-0.5 h-3 w-px bg-gray-400" />
          <div className="flex items-center gap-1.5 px-1.5 py-0.5">
            {flagBlobUrl && (
              <Image
                src={flagBlobUrl}
                alt={country || 'Flag'}
                className="h-3 w-4 object-contain shadow-sm"
                width={14}
                height={14}
              />
            )}
            {country && <span className="text-sm text-black">{country}</span>}
          </div>
        </>
      )}
    </div>
  );
};

export default BankDisplay;
