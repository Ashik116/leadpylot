'use client';

import { useEffect, useState } from 'react';
import isBrowser from '../isBrowser';

const twBreakpoint: Record<'3xl' | '2xl' | 'xl' | 'lg' | 'md' | 'sm' | 'xs', string> = {
  '3xl': '1920',
  '2xl': '1536',
  xl: '1280',
  lg: '1024',
  md: '768',
  sm: '640',
  xs: '576',
};

const breakpointInt = (str = '') => {
  return parseInt(str.replace('px', ''));
};

const breakpoint = {
  '3xl': breakpointInt(twBreakpoint['3xl']), // 1920
  '2xl': breakpointInt(twBreakpoint['2xl']), // 1536
  xl: breakpointInt(twBreakpoint.xl), // 1280
  lg: breakpointInt(twBreakpoint.lg), // 1024
  md: breakpointInt(twBreakpoint.md), // 768
  sm: breakpointInt(twBreakpoint.sm), // 640
  xs: breakpointInt(twBreakpoint.xs), // 576
};

const getAllSizes = (comparator = 'smaller') => {
  const currentWindowWidth = window.innerWidth;
  return Object.fromEntries(
    Object.entries(breakpoint).map(([key, value]) => [
      key,
      comparator === 'larger' ? currentWindowWidth > value : currentWindowWidth < value,
    ])
  );
};

const getResponsiveState = () => {
  if (isBrowser) {
    const currentWindowWidth = window.innerWidth;
    return {
      windowWidth: currentWindowWidth,
      larger: getAllSizes('larger'),
      smaller: getAllSizes('smaller'),
    };
  }
  return {
    windowWidth: 0,
    larger: {
      lg: false,
      md: false,
      sm: false,
      xs: false,
      xl: false,
      '2xl': false,
      '3xl': false,
    },
    smaller: {
      lg: false,
      md: false,
      sm: false,
      xs: false,
      xl: false,
      '2xl': false,
      '3xl': false,
    },
  };
};

const useResponsive = () => {
  const [responsive, setResponsive] = useState(getResponsiveState());

  const resizeHandler = () => {
    const responsiveState = getResponsiveState();
    setResponsive(responsiveState);
  };

  useEffect(() => {
    if (!isBrowser) return;
    window.addEventListener('resize', resizeHandler);
    return () => window.removeEventListener('resize', resizeHandler);
  }, [responsive.windowWidth]);

  return responsive;
};

export default useResponsive;
