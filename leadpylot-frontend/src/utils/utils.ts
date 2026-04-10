export const getStatusBadgeColor = (statusName: string) => {
  // i need if statusName if come "Confirmati..." then also count it as confirmation
  if (statusName?.includes('Confirmati...')) {
    statusName = 'confirmation';
  }

  let badgeColor = '';
  if (statusName?.toLowerCase().includes('new')) {
    badgeColor = 'bg-new border-new-border hover:bg-new/80'; // Ocean blue for new leads
  } else if (statusName?.toLowerCase().includes('opening')) {
    badgeColor = 'bg-ember'; // Ember for opening status
  } else if (statusName?.toLowerCase().includes('contract')) {
    badgeColor = 'bg-opening border-opening-border hover:bg-opening/80 text-black';
  } else if (statusName?.toLowerCase().includes('positiv')) {
    badgeColor = 'bg-positive border-positive-border hover:bg-positive/80'; // Evergreen for positive responses
  } else if (statusName?.toLowerCase().includes('negativ')) {
    badgeColor = 'bg-negative border-negative-border hover:bg-negative/80'; // Rust for negative responses
  } else if (statusName?.toLowerCase().includes('convert')) {
    badgeColor = 'bg-moss-2 hover:bg-moss-2/80'; // Moss for converted leads
  } else if (statusName?.toLowerCase().includes('reclamation')) {
    badgeColor = 'bg-rust hover:bg-rust/80'; // Sand for lost leads
  } else if (statusName?.toLowerCase().includes('lost')) {
    badgeColor = 'bg-lost border-lost-border text-white hover:bg-lost/80'; // Sand for lost leads
  } else if (statusName?.toLowerCase().includes('angebot')) {
    badgeColor = 'bg-angebot border-angebot-border hover:bg-angebot/80';
  } else if (statusName?.toLowerCase().includes('privat')) {
    badgeColor = 'bg-privat border-privat-border hover:bg-privat/80';
  } else if (statusName?.toLowerCase().includes('sent')) {
    badgeColor = 'bg-sent border-sent-border hover:bg-sent/80';
  } else if (statusName?.toLowerCase().includes('ne1')) {
    badgeColor = 'bg-ne1 border-ne1-border hover:bg-ne1/80';
  } else if (statusName?.toLowerCase().includes('ne2')) {
    badgeColor = 'bg-ne2 border-ne2-border hover:bg-ne2/80';
  } else if (statusName?.toLowerCase().includes('ne3')) {
    badgeColor = 'bg-ne3 border-ne3-border hover:bg-ne3/80';
  } else if (statusName?.toLowerCase().includes('ne4')) {
    badgeColor = 'bg-ne4 border-ne4-border hover:bg-ne4/80';
  } else if (statusName?.toLowerCase().includes('kein')) {
    badgeColor = 'bg-ember hover:bg-ember/80 text-white border-transparent';
  } else if (statusName?.toLowerCase().includes('termin')) {
    badgeColor = 'bg-termin border-termin-border hover:bg-termin/80';
  } else if (statusName?.toLowerCase().includes('out')) {
    badgeColor = 'bg-rust border-out-border text-white';
  } else if (statusName?.toLowerCase().includes('angaben')) {
    badgeColor = 'bg-angabenflash border-angabenflash-border hover:bg-angabenflash/80';
  } else if (statusName?.toLowerCase().includes('duplicate')) {
    badgeColor = 'bg-duplicate border-duplicate-border hover:bg-duplicate/80';
  } else if (statusName?.toLowerCase().includes('netto1')) {
    badgeColor = 'bg-netto1 border-netto1-border hover:bg-netto1/80';
  } else if (statusName?.toLowerCase().includes('netto2')) {
    badgeColor = 'bg-netto2 border-netto2-border hover:bg-netto2/80';
  } else if (statusName?.toLowerCase().includes('lost')) {
    badgeColor = 'bg-lost border-lost-border text-white hover:bg-lost/80';
  } else if (statusName?.toLowerCase().includes('confirmation')) {
    badgeColor = 'bg-confirmation border-confirmation-border hover:bg-confirmation/80';
  } else if (statusName?.toLowerCase().includes('payment')) {
    badgeColor = 'bg-payment border-payment-border hover:bg-payment/80 text-black';
  } else if (statusName?.toLowerCase().includes('opening')) {
    badgeColor = 'bg-opening border-opening-border hover:bg-opening/80';
  } else if (statusName?.toLowerCase().includes('offer_1')) {
    badgeColor = 'bg-lime-300 border-lime-300-border hover:bg-lime-300/80 text-black';
  } else if (statusName?.toLowerCase().includes('offer_2')) {
    badgeColor = 'bg-lime-400 border-lime-400-border hover:bg-lime-400/80 text-black';
  } else if (statusName?.toLowerCase().includes('offer_3')) {
    badgeColor = 'bg-lime-500 border-lime-500-border hover:bg-lime-500/80 text-black';
  } else if (statusName?.toLowerCase().includes('offer_4')) {
    badgeColor = 'bg-lime-600 border-lime-600-border hover:bg-lime-600/80 text-black';
  } else if (statusName?.toLowerCase().includes('offer')) {
    badgeColor = 'bg-lime-200 border-lime-200-border hover:bg-lime-200/80 text-black';
  } else if (statusName?.toLowerCase().includes('in use')) {
    badgeColor = 'bg-ocean-2';
  } else if (statusName?.toLowerCase().includes('pending')) {
    badgeColor = 'bg-ember';
  } else if (statusName?.toLowerCase().includes('reusable')) {
    badgeColor = 'bg-green-500';
  } else {
    badgeColor = 'bg-sand-2 text-white hover:bg-sand-2/80 border-transparent'; // Tropic as default
  }
  return badgeColor;
};
export const getStatusTextColor = (statusName: string) => {
  // Determine badge color based on status using project's color palette
  //  also need color for netto1, netto2, lost, confirmation, payment, opening
  let badgeColor = '';
  if (statusName?.toLowerCase().includes('new')) {
    badgeColor = 'text-evergreen'; // Ocean blue for new leads
  } else if (statusName?.toLowerCase().includes('opening')) {
    badgeColor = 'text-ember'; // Ember for opening status
  } else if (statusName?.toLowerCase().includes('contract')) {
    badgeColor = 'text-ember'; // Ember for opening status
  } else if (statusName?.toLowerCase().includes('positiv')) {
    badgeColor = 'text-evergreen'; // Evergreen for positive responses
  } else if (statusName?.toLowerCase().includes('negativ')) {
    badgeColor = 'text-rust'; // Rust for negative responses
  } else if (statusName?.toLowerCase().includes('convert')) {
    badgeColor = 'text-moss-2'; // Moss for converted leads
  } else if (statusName?.toLowerCase().includes('reclamation')) {
    badgeColor = 'text-rust'; // Sand for lost leads
  } else if (statusName?.toLowerCase().includes('lost')) {
    badgeColor = 'text-sand-2'; // Sand for lost leads
  } else if (statusName?.toLowerCase().includes('angebot')) {
    badgeColor = 'text-ocean-2';
  } else if (statusName?.toLowerCase().includes('privat')) {
    badgeColor = 'text-ocean-3/90';
  } else if (statusName?.toLowerCase().includes('sent')) {
    badgeColor = 'text-ocean-2';
  } else if (statusName?.toLowerCase().includes('ne1')) {
    badgeColor = 'bg-red-1 hover:bg-red-1/80  border-transparent text-white';
  } else if (statusName?.toLowerCase().includes('ne2')) {
    badgeColor = 'bg-red-2 hover:bg-red-2/80  border-transparent text-white';
  } else if (statusName?.toLowerCase().includes('ne3')) {
    badgeColor = 'bg-red-3 hover:bg-red-3/80  border-transparent text-white';
  } else if (statusName?.toLowerCase().includes('ne4')) {
    badgeColor = 'bg-red-4 hover:bg-red-4/80  border-transparent text-white';
  } else if (statusName?.toLowerCase().includes('Kein Interesse')) {
    badgeColor = 'bg-sand-1 hover:bg-sand-1/60 text-white border-transparent ';
  } else if (statusName?.toLowerCase().includes('netto1')) {
    badgeColor = 'text-netto1';
  } else if (statusName?.toLowerCase().includes('netto2')) {
    badgeColor = 'text-netto2';
  } else if (statusName?.toLowerCase().includes('lost')) {
    badgeColor = 'text-lost';
  } else if (statusName?.toLowerCase().includes('confirmation')) {
    badgeColor = 'text-confirmation';
  } else if (statusName?.toLowerCase().includes('payment')) {
    badgeColor = 'text-dark';
  } else if (statusName?.toLowerCase().includes('opening')) {
    badgeColor = 'text-opening';
  } else {
    badgeColor = 'text-sand-2'; // Tropic as default
  }
  return badgeColor;
};

/**
 * Get button styling classes for negative status buttons
 * @param statusCode - The status code (e.g., 'NE1', 'NE2', etc.)
 * @returns CSS classes for button styling
 */
export const getNegativeStatusButtonStyles = (statusCode: string): string => {
  const statusCodeUpper = statusCode.toUpperCase();

  switch (statusCodeUpper) {
    case 'NE1':
      // Least danger: very light red
      return 'bg-ne1 border-ne1-border hover:bg-ne1/80';
    case 'NE2':
      // Low danger: light-medium red
      return 'bg-ne2 border-ne2-border hover:bg-ne2/80';
    case 'NE3':
      // Medium danger: strong red
      return 'bg-ne3 border-ne3-border hover:bg-ne3/80';
    case 'NE4':
      // Maximum danger: deep red
      return 'bg-ne4 border-ne4-border hover:bg-ne4/80';
    case 'KEIN_INTERESSE':
      // Still negative: dark red
      return 'bg-ember hover:bg-ember/80 text-black border-transparent text-white';
    case 'RECLAMATION':
      // Reclamation: custom rust tone
      return 'bg-rust  text-white border-transparent';
    case 'OUT':
      // Reclamation: custom rust tone
      return 'bg-lost border-lost-border hover:bg-lost/80';
    case 'BLACKBOX':
      // Unknown/neutral: gray
      return 'bg-blackbox border-blackbox-border hover:bg-blackbox/80';
    default:
      // Default mild negative
      return 'bg-lost border-lost-border hover:bg-lost/80';
  }
};

/**
 * Get the appropriate icon name for status buttons
 * @param statusCode - The status code (e.g., 'NE1', 'NE2', etc.)
 * @returns Icon name for ApolloIcon component
 */
export const getStatusButtonIconName = (statusCode: string): string => {
  const statusCodeUpper = statusCode.toUpperCase();

  switch (statusCodeUpper) {
    case 'NE1':
    case 'NE2':
    case 'NE3':
    case 'NE4':
      return 'user-times';
    case 'KEIN_INTERESSE':
      return 'ban';
    case 'BLACKBOX':
      return 'box';
    case 'TERMIN':
      return 'calendar';
    case 'ANGEBOT':
      return 'file';
    case 'CALL':
      return 'phone';
    case 'PRIVAT':
      return 'user';
    case 'RECLAMATION':
      return 'user-times';
    default:
      return 'minus-circle';
  }
};
export const isDev = process.env.NODE_ENV === 'development';

// Extract parent name from document type
export const getDocumentTypeDisplay = (type: string): string => {
  // Handle hyphenated types like 'offer-extra', 'opening-contract', etc.
  if (type.includes('-')) {
    const parts = type.split('-');
    // Capitalize the first part (parent name)
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }

  // Handle single word types
  return type.charAt(0).toUpperCase() + type.slice(1);
};

export const getDocumentTypeOptions = [
  { value: 'offer-extra', label: 'Offer Extra' },
  { value: 'opening-contract', label: 'Opening Contract' },
  { value: 'opening-id', label: 'Opening ID' },
  { value: 'opening-extra', label: 'Opening Extra' },
  { value: 'confirmation-contract', label: 'Confirmation Contract' },
  { value: 'confirmation-extra', label: 'Confirmation Extra' },
  { value: 'payment-contract', label: 'Payment Contract' },
  { value: 'payment-extra', label: 'Payment Extra' },
  { value: 'netto1-mail', label: 'Netto1 Mail' },
  { value: 'netto2-mail', label: 'Netto2 Mail' },
  { value: 'offer-email', label: 'Offer Mail' },
  { value: 'opening-mail', label: 'Opening Mail' },
  { value: 'confirmation-mail', label: 'Confirmation Mail' },
  { value: 'payment-mail', label: 'Payment Mail' },
];
export const bindUrlParams = (params: any) => {
  return Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
};
export const formatNumber = (value: number) => {
  if (value === undefined || value === null || isNaN(Number(value))) {
    return '';
  }
  return Math.floor(value).toString();
};

export const formatLimitShort = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(Number(value)) || value === 0) {
    return '';
  }
  const n = Math.floor(value);
  if (n >= 1_000_000) return `${Math.floor(n / 1_000_000)}M`;
  if (n >= 1000) return `${Math.floor(n / 1000)}k`;
  return String(n);
};

export const formatLimitRange = (
  min: number | undefined | null,
  max: number | undefined | null
): string => {
  const minVal = min !== null && !isNaN(Number(min)) ? Math.floor(Number(min)) : null;
  const maxVal = max !== null && !isNaN(Number(max)) ? Math.floor(Number(max)) : null;

  if (minVal === null && maxVal === null) return '';
  if (minVal === null) return formatLimitShort(maxVal);
  if (maxVal === null) return formatLimitShort(minVal);

  if (minVal >= 1_000_000 && maxVal >= 1_000_000) {
    return `${Math.floor(minVal / 1_000_000)}M-${Math.floor(maxVal / 1_000_000)}M`;
  }
  if (minVal >= 1000 && maxVal >= 1000) {
    return `${Math.floor(minVal / 1000)}k-${Math.floor(maxVal / 1000)}k`;
  }

  return `${formatLimitShort(minVal)}-${formatLimitShort(maxVal)}`;
};

export const AGENT_COLORS: Record<string, string> = {
  A: 'text-red-500',
  B: 'text-red-600',
  C: 'text-red-700',
  G: 'text-orange-500',
  H: 'text-orange-600',
  I: 'text-orange-700',
  D: 'text-yellow-500',
  E: 'text-yellow-600',
  F: 'text-yellow-700',
  J: 'text-green-500',
  K: 'text-green-600',
  L: 'text-green-700',
  M: 'text-teal-500',
  N: 'text-teal-600',
  O: 'text-teal-700',
  P: 'text-blue-500',
  Q: 'text-blue-600',
  R: 'text-blue-700',
  S: 'text-indigo-500',
  T: 'text-indigo-600',
  U: 'text-indigo-700',
  V: 'text-purple-500',
  W: 'text-purple-600',
  X: 'text-purple-700',
  Y: 'text-pink-500',
  Z: 'text-pink-600',
};

/**
 * Formats a number with 2 decimal places and 'k' suffix for thousands (e.g. 14348 -> "14.35k").
 * Values under 1000 are shown as-is. Use with parseKNumber for round-trip.
 */
export function formatAmountK(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const numValue = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(numValue)) return String(value ?? '');
  if (numValue < 1000) return String(numValue);
  const inK = numValue / 1000;
  return `${inK.toFixed(2)}k`;
}

/**
 * Parses a string like "3254.34k", "1.2m", "5b" and returns the numeric value.
 * If the string ends with 'k' or 'K', multiplies by 1000.
 * If the string ends with 'm' or 'M', multiplies by 1,000,000.
 * If the string ends with 'b' or 'B', multiplies by 1,000,000,000.
 * Returns NaN if the input is not a valid number.
 * @param value string or number
 * @returns number
 */
export function parseKNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') {
    return value;
  }
  if (value === null || value === undefined) {
    return NaN;
  }
  if (typeof value !== 'string') {
    return NaN;
  }
  const trimmed = value.trim().toLowerCase();

  // Handle formatted strings like "6.78k", "1.2m", "5b", etc.
  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*([kmb]?)$/);
  if (match) {
    const [, numberPart, suffix] = match;
    const baseNumber = parseFloat(numberPart);

    if (isNaN(baseNumber)) {
      return NaN;
    }

    // Apply multiplier based on suffix
    switch (suffix) {
      case 'k':
        return baseNumber * 1000;
      case 'm':
        return baseNumber * 1000000;
      case 'b':
        return baseNumber * 1000000000;
      default:
        return baseNumber;
    }
  }

  // If no suffix, try to parse as regular number
  const num = parseFloat(trimmed);
  return isNaN(num) ? NaN : num;
}
export const isWindow = typeof window !== 'undefined';
export const isDocument = typeof document !== 'undefined';
export const getShortStatus = (str: string) =>
  str && str.length > 5 ? str.slice(0, 7) + '...' : str;

export const getShortWord = (word: string, maxLength: number = 10) => {
  if (word.length > maxLength) {
    return word.slice(0, maxLength) + '...';
  }
  return word;
};

export const truncateFileName = (name: string, maxLength = 50) => {
  if (!name) return '';
  if (name.length <= maxLength) return name;
  // Separate extension
  const parts = name.split('.');
  if (parts.length < 2) {
    return name.substring(0, maxLength) + '...';
  }

  const ext = parts.pop(); // extension
  const base = parts.join('.');

  const charsToShow = maxLength - (ext?.length || 0) - 3; // leave space for "..."
  const front = Math.ceil(charsToShow / 2);
  const back = Math.floor(charsToShow / 2);

  return base.substring(0, front) + '...' + base.substring(base.length - back) + '.' + ext;
};

// utils/getLocalTime.js

export function getLocalTime(timestamp: string) {
  if (!timestamp) return 'Invalid timestamp';

  // If the timestamp contains "days ago", return it directly
  if (typeof timestamp === 'string' && timestamp.toLowerCase().includes('ago')) {
    return timestamp;
  }

  const date = new Date(timestamp);

  // Format options
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true, // 12-hour format (set false for 24-hour)
  };

  // Automatically detects local timezone
  return date.toLocaleString(undefined, options as any);
}
export const getImageUrl = (imageUrl: string) => {
  if (!imageUrl) return '';

  // If it's already a full URL (http/https), use it as-is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // Otherwise, construct the full URL using API base URL
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
  // Ensure signature_url starts with / if it doesn't already
  const urlPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  return `${baseUrl}${urlPath}`;
};

export const useStatusBadgeColors: Record<string, string> = {
  new: 'bg-evergreen',
  usable: 'bg-evergreen',
  'not usable': 'bg-rust',
  'in use': 'bg-ocean-2',
  pending: 'bg-ember',
  reclamation: 'bg-rust',
  default: 'bg-sand-2',
};

// agent with colors
export const getAgentColor = (name: string): string => {
  try {
    if (!name || typeof name !== 'string') return 'text-gray-600';
    const trimmed = name.trim().toUpperCase();
    let key = '';
    if (trimmed?.length === 1) {
      key = trimmed?.charAt(0);
    } else if (trimmed?.length === 2) {
      key = trimmed?.slice(0, 2);
    } else if (trimmed?.length > 2) {
      key = trimmed?.slice(0, 2) + trimmed?.charAt(trimmed?.length - 1);
    }
    // Use a hash of the key to pick a color deterministically
    const colorKeys = Object?.keys(AGENT_COLORS);
    let hash = 0;
    for (let i = 0; i < key?.length; i++) {
      hash = (hash << 5) - hash + key?.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    const colorIndex = Math.abs(hash) % colorKeys?.length;
    return AGENT_COLORS[colorKeys?.[colorIndex]] || 'text-gray-500';
  } catch {
    return 'text-gray-500';
  }
};

// Offer call show status
export const offerCallShowStatus = [
  'Angebot',
  'Payment',
  'Payment Voucher',
  'Netto',
  'Netto2',
  'Netto1',
  'Netto 1',
  'Netto 2',
  'Opening',
  'Confirmation',
  'Contract',
  'Block',
  'Lost',
];
