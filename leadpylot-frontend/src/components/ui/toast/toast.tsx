import ToastWrapper from './ToastWrapper';
import { PLACEMENT } from '../utils/constants';
import type { ToastProps, ToastWrapperProps } from './ToastWrapper';
import { NotificationPlacement } from '../@types/placement';
import type { ReactNode } from 'react';

export const toastDefaultProps = {
  placement: PLACEMENT.BOTTOM_END,
  offsetX: 30,
  offsetY: 30,
  transitionType: 'scale',
  block: false,
};

export interface Toast {
  push(message: ReactNode, options?: ToastProps): string | undefined | Promise<string | undefined>;
  remove(key: string): void;
  removeAll(): void;
  clearAllWrappers(): void;
}

const defaultWrapperId = 'default';
const wrappers = new Map();

function castPlacment(placement: NotificationPlacement) {
  if (/\top\b/.test(placement)) {
    return 'top-full';
  }

  if (/\bottom\b/.test(placement)) {
    return 'bottom-full';
  }
}

async function createWrapper(wrapperId: string, props: ToastProps) {
  const [wrapper] = (await ToastWrapper.getInstance(props as ToastWrapperProps)) as any;

  wrappers.set(wrapperId || defaultWrapperId, wrapper);

  return wrapper;
}

function getWrapper(wrapperId?: string) {
  if (wrappers.size === 0) {
    return null;
  }
  return wrappers.get(wrapperId || defaultWrapperId);
}

const toast: Toast = (message: ReactNode) => toast.push(message);

toast.push = (message, options) => {
  const mergedOptions = { ...toastDefaultProps, ...options } as ToastProps;
  let id = mergedOptions.placement || PLACEMENT.BOTTOM_END;

  // TEMPORARY: Debug logging
  console.log('🍞 toast.push called:', {
    id,
    mergedOptions,
    wrappersCount: wrappers.size,
    wrapperKeys: Array.from(wrappers.keys()),
  });

  if (mergedOptions.block) {
    id = castPlacment(mergedOptions.placement as NotificationPlacement) || id;
  }

  // Use placement directly as wrapper ID - all toasts for this placement go to the same wrapper
  const wrapper = getWrapper(id);

  console.log('📦 Wrapper lookup result:', {
    id,
    wrapperExists: !!wrapper,
    wrapperHasCurrent: !!wrapper?.current,
  });

  if (wrapper?.current) {
    const result = wrapper.current.push(message);
    console.log('✅ Pushed to existing wrapper, result:', result);
    return result;
  }

  console.log('🔨 Creating new wrapper...');
  return createWrapper(id, mergedOptions).then((ref) => {
    console.log('✅ New wrapper created:', {
      hasRef: !!ref,
      hasCurrent: !!ref?.current,
    });
    const result = ref.current?.push(message);
    console.log('✅ Pushed to new wrapper, result:', result);
    return result;
  });
};

toast.remove = (key) => {
  wrappers.forEach((elm) => {
    elm.current.remove(key);
  });
};

toast.removeAll = () => {
  wrappers.forEach((elm) => {
    try {
      if (elm && elm.current && typeof elm.current.removeAll === 'function') {
        elm.current.removeAll();
      }
    } catch (error) {
      console.warn('Failed to remove notifications from wrapper:', error);
    }
  });
};

toast.clearAllWrappers = () => {
  wrappers.clear();
};

export default toast;
