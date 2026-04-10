'use client';

import React, { useState } from 'react';

interface ExpandableTextProps {
  /** The text content to display */
  text: string;
  /** Number of lines to show when collapsed (default: 2) */
  lines?: number;
  /** Minimum character count to enable truncation (default: 120) */
  minTruncateLength?: number;
  /** CSS class for the text paragraph */
  className?: string;
  /** Label for the expand button (default: "More") */
  moreLabel?: string;
  /** Label for the collapse button (default: "Less") */
  lessLabel?: string;
  /** CSS class for the More/Less toggle */
  toggleClassName?: string;
  /** Background color class for the "More" gradient fade (default: "from-white") */
  fadeBgClass?: string;
}

const ExpandableText: React.FC<ExpandableTextProps> = ({
  text,
  lines = 2,
  minTruncateLength = 120,
  className = 'break-all text-sm',
  moreLabel = 'More',
  lessLabel = 'Less',
  toggleClassName = 'cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-800',
  fadeBgClass = 'from-white',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) return null;

  const isTruncatable = text.length > minTruncateLength;

  // Tailwind line-clamp classes mapping
  const lineClampClass = `line-clamp-${lines}`;

  return (
    <div className="relative">
      <p className={`${className} ${isTruncatable && !isExpanded ? lineClampClass : ''}`}>
        {text}
        {isTruncatable && isExpanded && (
          <>
            {' '}
            <span onClick={() => setIsExpanded(false)} className={`inline ${toggleClassName}`}>
              {lessLabel}
            </span>
          </>
        )}
      </p>
      {isTruncatable && !isExpanded && (
        <span
          onClick={() => setIsExpanded(true)}
          className={`absolute right-0 bottom-0 bg-gradient-to-l ${fadeBgClass} from-60% to-transparent pl-8 ${toggleClassName}`}
        >
          {moreLabel}
        </span>
      )}
    </div>
  );
};

export default ExpandableText;
