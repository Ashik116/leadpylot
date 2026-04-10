'use client';
import {
  useState,
  useImperativeHandle,
  useRef,
  useCallback,
  cloneElement,
  createRef,
  useEffect,
} from 'react';
import classNames from 'classnames';
import chainedFunction from '../utils/chainedFunction';
import { motion } from 'framer-motion';
import { getPlacementTransition } from './transition';
import { PLACEMENT } from '../utils/constants';
import { createRoot, type Root } from 'react-dom/client';
import { NotificationPlacement } from '../@types/placement';
import type { DetailedReactHTMLElement, ReactNode, Ref } from 'react';
import toast from './toast';

type NodeProps = DetailedReactHTMLElement<any, HTMLDivElement>;

type Message = {
  key: string;
  visible: boolean;
  node: NodeProps;
};

const useMessages = (msgKey: string) => {
  const [messages, setMessages] = useState<Message[]>([]);

  const getKey = useCallback((key: string, currentMessages: Message[]) => {
    if (typeof key === 'undefined' && currentMessages.length) {
      key = currentMessages[currentMessages.length - 1].key;
    }
    return key;
  }, []);

  const push = useCallback(
    (message: NodeProps) => {
      const key = msgKey || '_' + Math.random().toString(36).substr(2, 12);
      // Use functional setState to avoid stale state issues with rapid consecutive calls
      console.log('📥 ToastWrapper.push called:', {
        key,
        msgKey,
        currentMessageCount: messages.length,
        message,
      });
      setMessages((prevMessages) => [...prevMessages, { key, visible: true, node: message }]);
      console.log('✅ Message added to state, new count will be:', messages.length + 1);
      return key;
    },
    [msgKey, messages.length]
  );

  const removeAll = useCallback(() => {
    // Use functional setState
    setMessages((prevMessages) => prevMessages.map((msg) => ({ ...msg, visible: false })));
    setTimeout(() => {
      setMessages([]);
    }, 50);
  }, []);

  const remove = useCallback(
    (key: string) => {
      // Use functional setState with getKey
      setMessages((prevMessages) =>
        prevMessages.map((elm) => {
          if (elm.key === getKey(key, prevMessages)) {
            elm.visible = false;
          }
          return elm;
        })
      );

      setTimeout(() => {
        setMessages((prevMessages) => prevMessages.filter((msg) => msg.visible));
      }, 50);
    },
    [getKey]
  );

  return { messages, push, removeAll, remove };
};

export interface ToastProps {
  transitionType?: 'scale' | 'fade';
  placement?: NotificationPlacement | 'top-full' | 'bottom-full';
  offsetX?: string | number;
  offsetY?: string | number;
  block?: boolean;
}

export interface ToastWrapperInstance {
  root: HTMLElement | null;
  push: (message: NodeProps) => string;
  remove: (key: string) => void;
  removeAll: () => void;
}

export interface ToastWrapperProps extends ToastProps {
  messageKey: string;
  callback: (ref: HTMLDivElement | null) => void;
  ref: Ref<ToastWrapperInstance>;
  wrapper?: HTMLElement | (() => HTMLElement);
}

const ToastWrapper = (props: ToastWrapperProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const {
    transitionType = 'scale',
    placement = PLACEMENT.BOTTOM_END as NotificationPlacement,
    offsetX = 30,
    offsetY = 30,
    messageKey,
    block = false,
    ref,
    callback,
    ...rest
  } = props;

  const { push, removeAll, remove, messages } = useMessages(messageKey);

  // TEMPORARY: Log on render
  console.log('🎨 ToastWrapper component rendering:', {
    messageKey,
    messageCount: messages.length,
    messages: messages.map(m => ({ key: m.key, visible: m.visible })),
  });

  // Listen for global clear all events
  useEffect(() => {
    const handleClearAll = () => {
      console.log('🧹 Clear all event received');
      removeAll();
    };

    window.addEventListener('toast-clear-all', handleClearAll);
    return () => {
      window.removeEventListener('toast-clear-all', handleClearAll);
    };
  }, [removeAll]);

  useImperativeHandle(ref, () => {
    console.log('🔗 ToastWrapper imperative handle called:', {
      root: rootRef.current,
      push: typeof push,
      removeAll: typeof removeAll,
      remove: typeof remove,
    });
    return { root: rootRef.current, push, removeAll, remove };
  });

  const placementTransition = getPlacementTransition({
    offsetX,
    offsetY,
    placement: placement as NotificationPlacement,
    transitionType,
  });

  const toastProps = {
    triggerByToast: true,
    ...rest,
  };

  // Only render the latest 5 items
  const messageElements = messages?.slice(-5)?.map((item) => {
    return (
      <motion.div
        key={item.key}
        className="toast-wrapper relative w-full"
        initial={placementTransition.variants.initial}
        variants={placementTransition.variants}
        animate={item.visible ? 'animate' : 'exit'}
        transition={{ duration: 0.15, type: 'tween' }}
      >
        {cloneElement(item.node as DetailedReactHTMLElement<any, HTMLElement>, {
          ...toastProps,
          ref,
          onClose: chainedFunction(item.node?.props?.onClose, () => remove(item.key)),
          className: classNames(item.node?.props?.className),
        })}
      </motion.div>
    );
  });

  return (
    <div
      style={placementTransition.default}
      {...rest}
      ref={(thisRef) => {
        rootRef.current = thisRef;
        callback?.(thisRef);
      }}
      className={classNames('toast', block && 'w-full')}
    >
      {messages?.length > 0 && (
        <div className="relative flex max-h-[90vh] w-full max-w-md flex-col">
          <div className="sticky z-50 flex shrink-0 justify-end bg-transparent">
            {messages?.length > 1 && (
              <button
                onClick={() => {
                  // First try the global toast removeAll
                  toast.removeAll();
                  // Also dispatch a custom event to ensure all instances get the message
                  window.dispatchEvent(new CustomEvent('toast-clear-all'));
                }}
                className="absolute -top-5 right-6 rounded-md bg-red-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition-all hover:bg-red-600 hover:shadow-xl focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none"
              >
                Clear All
              </button>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto p-5">
            {messageElements}
          </div>
        </div>
      )}
    </div>
  );
};

// Store created wrapper instances to prevent duplicates
const wrapperInstances = new Map<
  string,
  {
    element: HTMLDivElement;
    root: Root;
    wrapperRef: any;
    unmount: () => void;
  }
>();

// Track wrapper creations in progress to prevent race conditions
const pendingWrappers = new Map<string, Promise<any>>();

ToastWrapper.getInstance = (props: ToastWrapperProps) => {
  const { wrapper, ...rest } = props;

  const wrapperElement = (typeof wrapper === 'function' ? wrapper() : wrapper) || document.body;

  // Create wrapper key that matches the ID used in toast.tsx
  // If block mode, use castPlacment result, otherwise use placement directly
  let wrapperKey = rest.placement || 'bottom-end';
  if (rest.block) {
    // Match castPlacment logic from toast.tsx
    if (/\top\b/.test(wrapperKey)) {
      wrapperKey = 'top-full';
    } else if (/\bottom\b/.test(wrapperKey)) {
      wrapperKey = 'bottom-full';
    }
  }

  console.log('🏗️ ToastWrapper.getInstance called:', {
    wrapperKey,
    rest,
    existingWrappers: Array.from(wrapperInstances.keys()),
    pendingWrappers: Array.from(pendingWrappers.keys()),
  });

  // Check if wrapper is currently being created
  const pendingCreation = pendingWrappers.get(wrapperKey);
  if (pendingCreation) {
    console.log('⏳ Wrapper creation already pending for:', wrapperKey);
    return pendingCreation;
  }

  // Check if wrapper already exists for this configuration
  const existingInstance = wrapperInstances.get(wrapperKey);
  if (existingInstance) {
    // Return the existing wrapper ref instead of creating a new one
    console.log('♻️ Reusing existing wrapper:', wrapperKey);
    return Promise.resolve([existingInstance.wrapperRef, existingInstance.unmount]);
  }

  // Create new wrapper instance
  const wrapperRef = createRef<ToastWrapperInstance>();

  const creationPromise = new Promise((resolve) => {
    const renderCallback = () => {
      console.log('✅ ToastWrapper rendered and callback fired for:', wrapperKey);
      resolve([wrapperRef, unmount]);
    };

    function renderElement(element: ReactNode) {
      // Create new mount element and root
      const mountElement = document.createElement('div');
      mountElement.setAttribute('data-toast-wrapper', wrapperKey);
      mountElement.style.zIndex = '10000';
      console.log('📌 Creating mount element in DOM:', {
        wrapperKey,
        mountElement,
        parentElement: wrapperElement.tagName,
      });
      wrapperElement.appendChild(mountElement);

      const root = createRoot(mountElement);
      console.log('🌱 React root created for:', wrapperKey);

      // Render the ToastWrapper component
      root.render(element);

      return root;
    }

    const root = renderElement(
      <ToastWrapper {...rest} ref={wrapperRef} callback={renderCallback} />
    );

    const unmount = () => {
      root.unmount();
      wrapperInstances.delete(wrapperKey);
    };

    // Store the wrapper instance for reuse
    wrapperInstances.set(wrapperKey, {
      element: wrapperElement.querySelector(
        `[data-toast-wrapper="${wrapperKey}"]`
      ) as HTMLDivElement,
      root,
      wrapperRef,
      unmount,
    });

    console.log('💾 Wrapper instance stored:', {
      wrapperKey,
      totalInstances: wrapperInstances.size,
    });
  });

  // Store pending creation
  pendingWrappers.set(wrapperKey, creationPromise);

  // Clean up pending tracking when done
  creationPromise.finally(() => {
    pendingWrappers.delete(wrapperKey);
  });

  return creationPromise;
};

export default ToastWrapper;
