import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TableZoomState {
  zoomLevel: number;
  setZoomLevel: (level: number) => void;
  resetZoom: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

const MIN_ZOOM = 0.5; // 50%
const MAX_ZOOM = 2.0; // 200%
const DEFAULT_ZOOM = 1.0; // 100%
const ZOOM_STEP = 0.1; // 10% increments

export const useTableZoomStore = create<TableZoomState>()(
  persist(
    (set, get) => ({
      zoomLevel: DEFAULT_ZOOM,

      setZoomLevel: (level: number) => {
        const clampedLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level));
        set({ zoomLevel: clampedLevel });
      },

      resetZoom: () => {
        set({ zoomLevel: DEFAULT_ZOOM });
      },

      zoomIn: () => {
        const currentLevel = get().zoomLevel;
        const newLevel = Math.min(MAX_ZOOM, currentLevel + ZOOM_STEP);
        set({ zoomLevel: newLevel });
      },

      zoomOut: () => {
        const currentLevel = get().zoomLevel;
        const newLevel = Math.max(MIN_ZOOM, currentLevel - ZOOM_STEP);
        set({ zoomLevel: newLevel });
      },
    }),
    {
      name: 'table-zoom-storage',
      // Only persist zoom level, not the functions
      partialize: (state) => ({ zoomLevel: state.zoomLevel }),
    }
  )
);

// Helper function to get zoom styles
// Compensate width to show more content when zoomed out
// Height stays auto - no compensation needed
export const getTableZoomStyles = (zoomLevel: number) => {
  // Deterministic output on both server and client to avoid hydration mismatches.
  const level = Number.isFinite(zoomLevel) ? zoomLevel : 1;
  const widthPct = 100 / level;

  return {
    zoom: level,
    transform: `scale(${level})`,
    transformOrigin: 'left top',
    width: `${widthPct}%`,
    height: 'auto',
    display: 'inline-block',
  };
};

// Helper function to get zoom container styles
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getTableZoomContainerStyles = (zoomLevel: number) => ({
  width: '100%',
  height: '100%',
  overflowX: 'hidden',
  overflowY: 'auto',
});
