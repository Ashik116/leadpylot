'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';

const FALLBACK_FLAG = '/img/flag.svg';

function normalizeCountryCode(countryCode?: string | null): string | null {
  const t = countryCode?.trim().toLowerCase() ?? '';
  return /^[a-z]{2}$/.test(t) ? t : null;
}

function resolveSrc(countryCode: string | null, legacySrc?: string | null): string {
  if (countryCode) return `https://flagcdn.com/${countryCode}.svg`;
  if (legacySrc?.trim()) return legacySrc;
  return FALLBACK_FLAG;
}

export type CountryFlagFromCodeProps = {
  countryCode?: string | null;
  /** When CDN cannot be used (no valid code), show this URL if set */
  legacySrc?: string | null;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
};

export function CountryFlagFromCode({
  countryCode,
  legacySrc,
  alt,
  width = 24,
  height = 24,
  className,
}: CountryFlagFromCodeProps) {
  const code = useMemo(() => normalizeCountryCode(countryCode), [countryCode]);
  const resolved = useMemo(() => resolveSrc(code, legacySrc), [code, legacySrc]);
  const [src, setSrc] = useState(resolved);

  useEffect(() => {
    setSrc(resolved);
  }, [resolved]);

  const handleError = useCallback(() => {
    setSrc((current) => (current === FALLBACK_FLAG ? current : FALLBACK_FLAG));
  }, []);

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={handleError}
      unoptimized={src.startsWith('https://')}
    />
  );
}
