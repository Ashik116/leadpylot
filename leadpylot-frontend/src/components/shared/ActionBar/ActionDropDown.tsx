import Button from '@/components/ui/Button';
import type { ButtonProps } from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { Role } from '@/configs/navigation.config/auth.route.config';
import useNotification from '@/utils/hooks/useNotification';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
// import RoleGuard from '../RoleGuard';
import { useSession } from '@/hooks/useSession';

export const ActionDropDownContext = React.createContext(false);

type TActionDropDownProps = {
  deleteButton: boolean;
  setDeleteConfirmDialogOpen: () => void;
  children: React.ReactNode;
  selectedItems?: any[];
  actionShowOptions?: boolean;
  onActionClick?: () => void;
  buttonSize?: ButtonProps['size'];
  buttonIconClassName?: string;
  buttonIconName?: string;
  buttonLabel?: string;
  buttonClassName?: string;
};

export const ActionButton = ({
  icon,
  children,
  onClick,
  disabled,
  className,
  loading,
  iconClassName,
}: {
  icon?: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  loading?: boolean;
  iconClassName?: string;
}) => {
  const textColorClass = iconClassName
    ? iconClassName.split(' ').filter((cls) => cls.startsWith('text-')).join(' ')
    : '';

  return (
    <button
      className={`flex w-fit items-center gap-1 rounded px-2 py-0.5 text-left text-sm transition-colors duration-150 ${
        className || 'text-gray-700 hover:bg-gray-100 dark:text-[var(--dm-text-primary)] dark:hover:bg-[var(--dm-bg-hover)]'
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <ApolloIcon name={icon as any} className={`text-sm ${iconClassName}`} />}
      {textColorClass ? <span className={textColorClass}>{children}</span> : children}
      {loading && <ApolloIcon name="loading" className="animate-spin text-sm" />}
    </button>
  );
};

const ActionDropDown = ({
  deleteButton,
  setDeleteConfirmDialogOpen,
  children,
  selectedItems = [],
  actionShowOptions = true,
  onActionClick,
  buttonSize = 'xs',
  buttonIconClassName = 'text-sm',
  buttonIconName = 'cog',
  buttonLabel = 'Actions',
  buttonClassName,
}: TActionDropDownProps) => {
  const { data: session } = useSession();
  const isPermission = session?.user.role === Role.ADMIN || session?.user.role === Role.AGENT;
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    left: -9999,
    top: -9999,
  });
  const [menuReady, setMenuReady] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const { openNotification } = useNotification();
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideTrigger = dropdownRef.current?.contains(target);
      const isInsideMenu = menuRef.current?.contains(target);
      if (!isInsideTrigger && !isInsideMenu) {
        setShowActionDropdown(false);
      }
    };

    if (showActionDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActionDropdown]);

  useEffect(() => {
    const container = typeof document !== 'undefined' ? document.body : null;
    if (container) {
      setTimeout(() => {
        setPortalContainer(container);
      }, 0);
    }
  }, []);

  useEffect(() => {
    if (!showActionDropdown) return;

    const updateMenuPosition = () => {
      const triggerEl = triggerRef.current;
      const menuEl = menuRef.current;
      if (!triggerEl || !menuEl) return;

      const rect = triggerEl.getBoundingClientRect();
      const menuWidth = menuEl.offsetWidth;
      const menuHeight = menuEl.offsetHeight;
      const gap = 8;

      let left = rect.left;
      let top = rect.bottom + gap;

      // Prevent overflow on the right edge
      if (left + menuWidth > window.innerWidth - gap) {
        left = Math.max(gap, window.innerWidth - menuWidth - gap);
      }

      // If dropdown would go beyond bottom, flip above
      if (top + menuHeight > window.innerHeight - gap) {
        top = Math.max(gap, rect.top - menuHeight - gap);
      }

      setMenuStyle({
        position: 'fixed',
        left,
        top,
      });
      setMenuReady(true);
    };

    const rafId = requestAnimationFrame(updateMenuPosition);
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [showActionDropdown]);

  useEffect(() => {
    if (!showActionDropdown) {
      setTimeout(() => {
        setMenuReady(false);
      }, 0);
    }
  }, [showActionDropdown]);

  const onCLickAction = () => {
    if (selectedItems.length === 0 && actionShowOptions) {
      return openNotification({
        type: 'info',
        massage: 'No items selected',
      });
    }
    return setShowActionDropdown(!showActionDropdown);
  };

  const menuContent = (
    <div
      ref={menuRef}
      style={menuStyle}
      className={`z-[100010] min-w-max w-max origin-top transform whitespace-nowrap rounded-md border border-gray-200 bg-white shadow-lg dark:bg-[var(--dm-bg-elevated)] dark:border-[var(--dm-border)] ${
        // Only transition opacity and transform - NOT left/top. transition-all would animate
        // position from -9999 to correct spot on first open, causing visible shake/slide.
        menuReady ? 'transition-[opacity,transform] duration-200 ease-in-out' : 'transition-none'
      } ${
        showActionDropdown && menuReady
          ? 'translate-y-0 scale-y-100 opacity-100'
          : 'pointer-events-none -translate-y-2 scale-y-95 opacity-0'
      }`}
    >
      <div className="py-1">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            // Handle nested children (e.g., RoleGuard wrapping ActionButton)
            const childChildren = (child.props as any)?.children;
            if (childChildren && React.isValidElement(childChildren)) {
              const originalOnClick = (childChildren.props as any)?.onClick;
              return React.cloneElement(child as React.ReactElement<any>, {
                children: React.cloneElement(childChildren as React.ReactElement<any>, {
                  onClick: () => {
                    if (originalOnClick) {
                      originalOnClick();
                    }
                    onActionClick?.();
                    setShowActionDropdown(false);
                  },
                }),
              });
            }
            // Handle direct ActionButton
            const originalOnClick = (child.props as any)?.onClick;
            if (originalOnClick) {
              return React.cloneElement(child as React.ReactElement<any>, {
                onClick: () => {
                  originalOnClick();
                  onActionClick?.();
                  setShowActionDropdown(false);
                },
              });
            }
          }
          return child;
        })}
        {deleteButton && isPermission && (
          <>
            <hr className="my-1 border-gray-200 dark:border-[var(--dm-border)]" />
            <button
              className="flex w-full items-center gap-2 px-2 py-2 text-left text-sm text-red-600 transition-colors duration-150 hover:bg-red-50 dark:hover:bg-red-500/10"
              onClick={() => {
                setDeleteConfirmDialogOpen();
                onActionClick?.();
                setShowActionDropdown(false);
              }}
            >
              <ApolloIcon name="trash" className="text-sm" />
              <span>Delete</span>
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <ActionDropDownContext.Provider value={true}>
      <div className="relative" ref={dropdownRef}>
        <div ref={triggerRef} className="inline-flex">
          <Button
            size={buttonSize}
            disabled={selectedItems.length === 0}
            icon={<ApolloIcon name={buttonIconName as any} className={buttonIconClassName} />}
            onClick={onCLickAction}
            className={buttonClassName}
          >
            <span>{buttonLabel}</span>
          </Button>
        </div>
        {portalContainer ? createPortal(menuContent, portalContainer) : menuContent}
      </div>
    </ActionDropDownContext.Provider>
  );
};

export default ActionDropDown;
