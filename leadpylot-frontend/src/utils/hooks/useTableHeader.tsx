import { useCallback } from 'react';

export const useTableHeader = (
  className = 'whitespace-nowrap text-xs font-medium'
) =>
  useCallback((label: string) => <span className={className}>{label}</span>, [className]);
