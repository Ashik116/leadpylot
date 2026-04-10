import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from './constants';

interface UseSidebarLogicProps {
  sidebarVisible: boolean;
  lastSelectedType: string | null;
  setSidebarKey: (updater: (prev: number) => number) => void;
}

export const useSidebarLogic = ({
  sidebarVisible,
  lastSelectedType,
  setSidebarKey,
}: UseSidebarLogicProps) => {
  const queryClient = useQueryClient();
  const [prevSidebarVisible, setPrevSidebarVisible] = useState(sidebarVisible);

  useEffect(() => {
    if (prevSidebarVisible && !sidebarVisible && lastSelectedType) {
      const keys = QUERY_KEYS[lastSelectedType];
      if (keys) {
        keys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: [key] });
          queryClient.refetchQueries({ queryKey: [key] });
        });
      }
      setTimeout(() => setSidebarKey((prev) => prev + 1), 100);
    }
    setTimeout(() => setPrevSidebarVisible(sidebarVisible), 100);
  }, [sidebarVisible, prevSidebarVisible, lastSelectedType, queryClient, setSidebarKey]);
};

