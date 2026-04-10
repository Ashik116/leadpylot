import React from 'react';

interface TruncatedTextProps {
  text: string;
  maxLength?: number;
  className?: string;
  title?: string;
}

const TruncatedText: React.FC<TruncatedTextProps> = ({
  text,
  maxLength = 20,
  className = '',
  title,
}) => {
  const truncateText = (inputText: string, maxLen: number): string => {
    if (!inputText || inputText?.length <= maxLen) {
      return inputText;
    }

    // Auto-detect if it's a file by checking for extension
    const lastDotIndex = inputText.lastIndexOf('.');
    const hasExtension = lastDotIndex !== -1 && lastDotIndex < inputText?.length - 1;

    if (hasExtension) {
      // Handle file names with extensions
      const name = inputText.substring(0, lastDotIndex);
      const extension = inputText.substring(lastDotIndex);

      if (name?.length <= maxLen - extension?.length) {
        return inputText; // No truncation needed
      }

      // Truncate name part, keep extension
      const truncatedName = name.substring(0, maxLen - extension?.length - 3) + '...';
      return truncatedName + extension;
    } else {
      // Handle regular text (first 10 + last 10 letters)
      const firstPart = inputText.substring(0, 10);
      const lastPart = inputText.substring(inputText?.length - 10);
      return `${firstPart}...${lastPart}`;
    }
  };

  const shouldShowTooltip = text?.length > maxLength;

  return (
    <span
      className={`cursor-default ${className}`}
      title={shouldShowTooltip ? title || text : undefined}
    >
      {truncateText(text, maxLength)}
    </span>
  );
};

export default TruncatedText;
