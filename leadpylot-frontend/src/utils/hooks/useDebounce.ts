'use client';

import debounce from 'lodash/debounce';
import type { DebounceSettingsLeading } from 'lodash';

function useDebounce<T extends (...args: any) => any>(
  func: T,
  wait: number | undefined,
  options?: DebounceSettingsLeading
) {
  return debounce(func, wait, options);
}

export default useDebounce;
