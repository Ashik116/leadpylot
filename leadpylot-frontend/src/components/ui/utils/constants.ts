export enum SIZES {
  XS = 'xs',
  SM = 'sm',
  MD = 'md',
  LG = 'lg',
}

export const CONTROL_SIZES: Record<SIZES, { h: string; w: string; minH: string; minW: string }> = {
  [SIZES.XS]: {
    h: 'h-6',
    w: 'w-6',
    minH: 'min-h-6',
    minW: 'min-w-6',
  },
  [SIZES.SM]: {
    h: 'h-7',
    w: 'w-7',
    minH: 'min-h-7',
    minW: 'min-w-7',
  },
  [SIZES.MD]: {
    h: 'h-8',
    w: 'w-8',
    minH: 'min-h-8',
    minW: 'min-w-8',
  },
  [SIZES.LG]: {
    h: 'h-10',
    w: 'w-10',
    minH: 'min-h-10',
    minW: 'min-w-10',
  },
};

export const SEGMENT_SIZES: Record<SIZES, { h: string; w: string; minH: string; minW: string }> = {
  [SIZES.XS]: {
    h: 'h-4',
    w: 'w-4',
    minH: 'min-h-4',
    minW: 'min-w-4',
  },
  [SIZES.SM]: {
    h: 'h-5',
    w: 'w-5',
    minH: 'min-h-5',
    minW: 'min-w-5',
  },
  [SIZES.MD]: {
    h: 'h-6',
    w: 'w-6',
    minH: 'min-h-6',
    minW: 'min-w-6',
  },
  [SIZES.LG]: {
    h: 'h-8',
    w: 'w-8',
    minH: 'min-h-8',
    minW: 'min-w-8',
  },
};

export const LAYOUT = {
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
  INLINE: 'inline',
};

export const DIRECTIONS = {
  TOP: 'top',
  RIGHT: 'right',
  BOTTOM: 'bottom',
  LEFT: 'left',
};

export const SELECTION_MODES = {
  YEAR: 'year',
  MONTH: 'month',
  DAY: 'day',
};

export const PICKER_VIEWS = {
  YEAR: 'year',
  MONTH: 'month',
  DATE: 'date',
};

export const STATUS = {
  DANGER: 'danger',
  SUCCESS: 'success',
  WARNING: 'warning',
};

export const STEPS_STATUS = {
  COMPLETE: 'complete',
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  ERROR: 'error',
};

export const PLACEMENT = {
  TOP_START: 'top-start',
  TOP_CENTER: 'top-center',
  TOP_END: 'top-end',
  BOTTOM_START: 'bottom-start',
  BOTTOM_CENTER: 'bottom-center',
  BOTTOM_END: 'bottom-end',
  MIDDLE_START_TOP: 'middle-start-top',
  MIDDLE_START_BOTTOM: 'middle-start-bottom',
  MIDDLE_END_TOP: 'middle-end-top',
  MIDDLE_END_BOTTOM: 'middle-end-bottom',
};

export const DROPDOWN_ITEM_TYPE: Record<string, 'default' | 'header' | 'divider' | 'custom'> = {
  DEFAULT: 'default',
  HEADER: 'header',
  DIVIDER: 'divider',
  CUSTOM: 'custom',
};

export const DAY_DURATION = 86400000;

export const IN_USE_STATUS = {
  NEW: 'new',
  IN_USE: 'in_use',
  PENDING: 'pending',
  REUSABLE: 'reusable',
  RECLAMATION: 'reclamation',
};
export const IN_USE_STATUS_OPTIONS = [
  { label: 'New', value: IN_USE_STATUS.NEW },
  { label: 'In Use', value: IN_USE_STATUS.IN_USE },
  { label: 'Pending', value: IN_USE_STATUS.PENDING },
  { label: 'Reusable', value: IN_USE_STATUS.REUSABLE },
  { label: 'Reclamation', value: IN_USE_STATUS.RECLAMATION },
];
