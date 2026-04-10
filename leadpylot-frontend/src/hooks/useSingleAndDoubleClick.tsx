import { useState } from 'react';

// Custom hook for handling single vs double clicks
const useSingleAndDoubleClick = (
  onSingleClick: (e: React.MouseEvent) => void,
  onDoubleClick: (e: React.MouseEvent) => void,
  delay: number = 300
) => {
  const [clickTimeout, setClickTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (clickTimeout) {
      // This is a double click
      clearTimeout(clickTimeout);
      setClickTimeout(null);
      if (onDoubleClick) onDoubleClick(e);
    } else {
      // This might be a single click
      const timeout = setTimeout(() => {
        if (onSingleClick) onSingleClick(e);
        setClickTimeout(null);
      }, delay);
      setClickTimeout(timeout);
    }
  };

  return handleClick;
};

export default useSingleAndDoubleClick;
