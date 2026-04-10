'use client';

/**
 * LabelBadge Component
 * Display a single label badge with color
 */

import ApolloIcon from '@/components/ui/ApolloIcon';

interface LabelBadgeProps {
  label: {
    _id: string;
    name: string;
    color?: string;
  };
  onRemove?: () => void;
  size?: 'sm' | 'md';
}

const colorMap: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700 border-blue-300',
  green: 'bg-green-100 text-green-700 border-green-300',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  red: 'bg-red-100 text-red-700 border-red-300',
  purple: 'bg-purple-100 text-purple-700 border-purple-300',
  pink: 'bg-pink-100 text-pink-700 border-pink-300',
  gray: 'bg-gray-100 text-gray-700 border-gray-300',
  orange: 'bg-orange-100 text-orange-700 border-orange-300',
};

export default function LabelBadge({ label, onRemove, size = 'sm' }: LabelBadgeProps) {
  const colorClass = colorMap[label.color || 'gray'] || colorMap.gray;
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${colorClass} ${sizeClass}`}
    >
      {label.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:opacity-70 transition-opacity"
        >
          <ApolloIcon name="x" className="text-xs" />
        </button>
      )}
    </span>
  );
}

