'use client';

import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import BackButton from '../../../mails/_components/Shared/BackButton';

const STATUS_LABELS: Record<number, string> = {
  0: 'Pending',
  1: 'Accepted',
  2: 'Rejected',
};

const STATUS_BADGE_CLASSES: Record<number, string> = {
  0: 'rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800',
  1: 'rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800',
  2: 'rounded-full bg-rust/10 px-2.5 py-0.5 text-xs font-medium text-rust',
};

export interface ReclamationHeaderProps {
  title: string;
  status?: number;
  onBack: () => void;
}

const ReclamationHeader = ({ title = '', status = 0 }: ReclamationHeaderProps) => {
  const statusLabel = STATUS_LABELS[status] ?? 'Pending';
  const badgeClass = STATUS_BADGE_CLASSES[status] ?? STATUS_BADGE_CLASSES[0];

  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <BackButton />
        <h4 className="text-lg font-semibold text-black">{title}</h4>
        <span className={badgeClass}>{statusLabel}</span>
      </div>
    </div>
  );
};

export default ReclamationHeader;
