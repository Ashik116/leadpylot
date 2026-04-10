'use client';

/**
 * EmailLayout - Missive-Inspired Three-Column Layout
 *
 * Layout structure:
 * [Sidebar (200px)] [ConversationList (350px)] [EmailDetail (flex)]
 *
 * Responsive:
 * - Desktop: Three columns
 * - Tablet: Two columns (sidebar collapsible)
 * - Mobile: Stacked views
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useEmailStore } from '../../_stores/emailStore';
import { useUrlSync, parseUrlHash, updateUrlHash } from '../../_hooks/useUrlSync';
import { useEmailDetail } from '../../_hooks/useEmailData';
import Sidebar from './Sidebar';
import ConversationList from './ConversationList';
import EmailDetail from './EmailDetail';
import ComposeModal from '../Compose/ComposeModal';
import SyncProgressBanner from '../Sync/SyncProgressBanner';
import KeyboardShortcutsModal from '../Help/KeyboardShortcutsModal';
// import { usePresence } from '../../_hooks/usePresence';
import { useKeyboardShortcuts } from '../../_hooks/useKeyboardShortcuts';
import { UrlEmailState } from '../../_types/email.types';

const SIDEBAR_MIN_WIDTH = 60;
const SIDEBAR_MAX_WIDTH = 400;
const SIDEBAR_DEFAULT_WIDTH = 200;
const SIDEBAR_WIDTH_STORAGE_KEY = 'email-sidebar-width';

const CONVERSATION_MIN_WIDTH = 300;
const CONVERSATION_MAX_WIDTH = 600;
const CONVERSATION_DEFAULT_WIDTH = 350;
const CONVERSATION_WIDTH_STORAGE_KEY = 'email-conversation-width';

export default function EmailLayout() {
  const {
    isSidebarCollapsed,
    isComposeOpen,
    selectedConversation,
    setComposeOpen,
    currentView,
    setCurrentView,
    selectConversation,
    conversations,
  } = useEmailStore();

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === 'undefined') return SIDEBAR_DEFAULT_WIDTH;
    const stored = localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    return stored
      ? Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, parseInt(stored, 10)))
      : SIDEBAR_DEFAULT_WIDTH;
  });

  const [conversationWidth, setConversationWidth] = useState(() => {
    if (typeof window === 'undefined') return CONVERSATION_DEFAULT_WIDTH;
    const stored = localStorage.getItem(CONVERSATION_WIDTH_STORAGE_KEY);
    return stored
      ? Math.max(CONVERSATION_MIN_WIDTH, Math.min(CONVERSATION_MAX_WIDTH, parseInt(stored, 10)))
      : CONVERSATION_DEFAULT_WIDTH;
  });

  const [isResizing, setIsResizing] = useState(false);
  const [isConversationResizing, setIsConversationResizing] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);
  const sidebarRef = useRef<HTMLElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);
  const conversationRafId = useRef<number | null>(null);
  const isResizingRef = useRef(false);
  const isConversationResizingRef = useRef(false);

  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Initialize urlEmailId from URL on mount
  const [urlEmailId, setUrlEmailId] = useState<string | null>(() => {
    const urlState = parseUrlHash();
    return urlState.emailId || null;
  });

  // Track if initial URL has been processed to prevent duplicate selections
  const hasProcessedInitialUrl = useRef(false);

  const scheduleUpdate = useCallback((fn: () => void) => {
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(fn);
    } else {
      setTimeout(fn, 0);
    }
  }, []);

  // Use React Query to fetch email by ID from URL
  const { data: urlEmailData } = useEmailDetail(urlEmailId);
  // Initial setup: Parse URL or use sessionStorage/default
  useEffect(() => {
    const urlState = parseUrlHash();

    // Set the view from URL if present
    if (urlState.view) {
      scheduleUpdate(() => setCurrentView(urlState.view));
    } else if (!currentView) {
      // Fallback to sessionStorage or default
      try {
        const stored = JSON.parse(sessionStorage.getItem('email-store') || '{}');
        const view = stored.state?.currentView;
        const validViews = [
          'inbox',
          'sent',
          'starred',
          'snoozed',
          'archived',
          'all',
          'trash',
          'pending',
        ];

        const defaultView = validViews.includes(view) ? view : 'inbox';
        scheduleUpdate(() => setCurrentView(defaultView));
        scheduleUpdate(() => updateUrlHash(defaultView as any));
      } catch {
        scheduleUpdate(() => setCurrentView('inbox'));
        scheduleUpdate(() => updateUrlHash('inbox'));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount - handleUrlChange handles all URL state

  // Handle URL hash changes (browser back/forward)
  const handleUrlChange = useCallback(
    (urlState: UrlEmailState) => {
      // Update view if changed
      if (urlState.view && urlState.view !== currentView) {
        scheduleUpdate(() => setCurrentView(urlState.view));
      }

      // Handle email selection from URL
      if (urlState.emailId) {
        // Reset flag if we're navigating to a different email
        if (urlState.emailId !== urlEmailId) {
          hasProcessedInitialUrl.current = false;
        }

        // Check if email is already in conversations
        const existingEmail = conversations.find((c) => c._id === urlState.emailId);

        if (existingEmail) {
          scheduleUpdate(() => selectConversation(existingEmail));
          hasProcessedInitialUrl.current = true;
        } else {
          // Set URL email ID to trigger React Query fetch
          scheduleUpdate(() => setUrlEmailId(urlState.emailId));
        }
      } else {
        // No email ID in URL, clear selection
        scheduleUpdate(() => setUrlEmailId(null));
        if (selectedConversation) {
          scheduleUpdate(() => selectConversation(null));
        }
      }
    },
    [
      currentView,
      scheduleUpdate,
      setCurrentView,
      selectConversation,
      conversations,
      selectedConversation,
      urlEmailId,
    ]
  );

  // When URL email data arrives from React Query, select it
  useEffect(() => {
    if (urlEmailData?.email && urlEmailId && !hasProcessedInitialUrl.current) {
      scheduleUpdate(() => {
        selectConversation(urlEmailData.email as any);
        hasProcessedInitialUrl.current = true;
      });
    }
  }, [urlEmailData, urlEmailId, selectConversation, scheduleUpdate]);

  // Initialize URL sync
  useUrlSync(handleUrlChange);

  // Fast path: If email is already in conversations list, select it immediately
  useEffect(() => {
    // Only process once, and only if we haven't processed yet
    if (urlEmailId && conversations.length > 0 && !hasProcessedInitialUrl.current) {
      const existingEmail = conversations.find((c) => c._id === urlEmailId);

      if (existingEmail) {
        // Email found in conversation list, select it immediately (fast path)
        scheduleUpdate(() => {
          selectConversation(existingEmail);
          hasProcessedInitialUrl.current = true;
        });
      }
      // If existingEmail is undefined, don't set the flag - let urlEmailData effect handle it
    }
  }, [conversations, selectConversation, urlEmailId, scheduleUpdate]);

  // Initialize presence tracking
  // usePresence();

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  // Listen for show shortcuts event
  useEffect(() => {
    const handleShowShortcuts = () => setShowShortcutsHelp(true);
    window.addEventListener('email:show_shortcuts', handleShowShortcuts);
    return () => window.removeEventListener('email:show_shortcuts', handleShowShortcuts);
  }, []);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!sidebarRef.current) return;

      const getCurrentWidth = () => {
        const inline = sidebarRef.current!.style.width;
        if (inline) {
          const parsed = parseInt(inline, 10);
          if (parsed > 0) return parsed;
        }
        const computed = parseInt(window.getComputedStyle(sidebarRef.current!).width, 10);
        return computed > 0 ? computed : sidebarWidth;
      };

      isResizingRef.current = true;
      setIsResizing(true);
      resizeStartX.current = e.clientX;
      resizeStartWidth.current = getCurrentWidth();
      Object.assign(document.body.style, { cursor: 'col-resize', userSelect: 'none' });

      const handleMove = (moveEvent: MouseEvent) => {
        if (!isResizingRef.current || !sidebarRef.current) return;
        const newWidth = Math.max(
          SIDEBAR_MIN_WIDTH,
          Math.min(
            SIDEBAR_MAX_WIDTH,
            resizeStartWidth.current + moveEvent.clientX - resizeStartX.current
          )
        );

        if (rafId.current) cancelAnimationFrame(rafId.current);
        rafId.current = requestAnimationFrame(() => {
          if (sidebarRef.current && isResizingRef.current) {
            sidebarRef.current.style.width = `${newWidth}px`;
            setSidebarWidth(newWidth);
          }
        });
      };

      const handleEnd = () => {
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
          rafId.current = null;
        }
        const finalWidth = sidebarRef.current
          ? parseInt(sidebarRef.current.style.width || '0', 10) || sidebarWidth
          : sidebarWidth;
        localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, finalWidth.toString());
        setSidebarWidth(finalWidth);
        isResizingRef.current = false;
        setIsResizing(false);
        Object.assign(document.body.style, { cursor: '', userSelect: '' });
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
    },
    [sidebarWidth]
  );

  const handleConversationResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!conversationRef.current) return;

      const getCurrentWidth = () => {
        const inline = conversationRef.current!.style.width;
        if (inline) {
          const parsed = parseInt(inline, 10);
          if (parsed > 0) return parsed;
        }
        const computed = parseInt(window.getComputedStyle(conversationRef.current!).width, 10);
        return computed > 0 ? computed : conversationWidth;
      };

      isConversationResizingRef.current = true;
      setIsConversationResizing(true);
      resizeStartX.current = e.clientX;
      resizeStartWidth.current = getCurrentWidth();
      Object.assign(document.body.style, { cursor: 'col-resize', userSelect: 'none' });

      const handleMove = (moveEvent: MouseEvent) => {
        if (!isConversationResizingRef.current || !conversationRef.current) return;
        const newWidth = Math.max(
          CONVERSATION_MIN_WIDTH,
          Math.min(
            CONVERSATION_MAX_WIDTH,
            resizeStartWidth.current + moveEvent.clientX - resizeStartX.current
          )
        );

        if (conversationRafId.current) cancelAnimationFrame(conversationRafId.current);
        conversationRafId.current = requestAnimationFrame(() => {
          if (conversationRef.current && isConversationResizingRef.current) {
            conversationRef.current.style.width = `${newWidth}px`;
            setConversationWidth(newWidth);
          }
        });
      };

      const handleEnd = () => {
        if (conversationRafId.current) {
          cancelAnimationFrame(conversationRafId.current);
          conversationRafId.current = null;
        }
        const finalWidth = conversationRef.current
          ? parseInt(conversationRef.current.style.width || '0', 10) || conversationWidth
          : conversationWidth;
        localStorage.setItem(CONVERSATION_WIDTH_STORAGE_KEY, finalWidth.toString());
        setConversationWidth(finalWidth);
        isConversationResizingRef.current = false;
        setIsConversationResizing(false);
        Object.assign(document.body.style, { cursor: '', userSelect: '' });
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
    },
    [conversationWidth]
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      {/* Sync Progress Banner - Shows at top when syncing */}
      <SyncProgressBanner />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Folders, Labels, Teams */}
        <div className="flex shrink-0">
          <aside
            ref={sidebarRef}
            className={`${isSidebarCollapsed ? 'w-0' : ''} overflow-hidden border-r border-gray-200 bg-gray-50 ${isResizing ? 'select-none' : 'transition-all duration-200 ease-in-out'}`}
            style={!isSidebarCollapsed ? { width: `${sidebarWidth}px` } : undefined}
          >
            {!isSidebarCollapsed && <Sidebar width={sidebarWidth} />}
          </aside>
          {!isSidebarCollapsed && (
            <div
              onMouseDown={handleResizeStart}
              className="w-1 shrink-0 cursor-col-resize bg-transparent transition-colors duration-150 hover:bg-blue-300"
              role="separator"
              aria-label="Resize sidebar"
            />
          )}
        </div>

        {/* Middle Panel - Conversation List */}
        <div className={`flex ${selectedConversation ? 'shrink-0' : 'flex-1'}`}>
          <div
            ref={conversationRef}
            className={`flex flex-col overflow-hidden border-r border-gray-200 bg-white ${selectedConversation
              ? isConversationResizing
                ? 'select-none'
                : 'transition-all duration-200 ease-in-out'
              : 'flex-1'
              }`}
            style={selectedConversation ? { width: `${conversationWidth}px` } : undefined}
          >
            <ConversationList />
          </div>
          {selectedConversation && (
            <div
              onMouseDown={handleConversationResizeStart}
              className="w-1 shrink-0 cursor-col-resize bg-transparent transition-colors duration-150 hover:bg-blue-300"
              role="separator"
              aria-label="Resize conversation list"
            />
          )}
        </div>

        {/* Right Panel - Email Detail */}
        {selectedConversation && (
          <main className="flex-1 overflow-hidden bg-white">
            <EmailDetail conversation={selectedConversation} hidePinning={true} />
          </main>
        )}

        {/* Compose Modal */}
        {isComposeOpen && (
          <ComposeModal isOpen={isComposeOpen} onClose={() => setComposeOpen(false)} />
        )}

        {/* Keyboard Shortcuts Help Modal */}
        {showShortcutsHelp && (
          <KeyboardShortcutsModal onClose={() => setShowShortcutsHelp(false)} />
        )}
      </div>
    </div>
  );
}
