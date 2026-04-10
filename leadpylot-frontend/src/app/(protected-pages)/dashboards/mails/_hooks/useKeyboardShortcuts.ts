/**
 * useKeyboardShortcuts Hook
 * Missive-style keyboard shortcuts for email navigation
 */

import { useEffect, useCallback, useRef } from 'react';
import { useEmailStore } from '../_stores/emailStore';

export function useKeyboardShortcuts() {
  const {
    conversations,
    selectedConversation,
    selectConversation,
    setComposeOpen,
    setCurrentView,
    setFilters,
    updateConversation,
  } = useEmailStore();

  // Track "g" key for combo shortcuts (g+i, g+s, etc.)
  const gPressed = useRef(false);
  const gTimeout = useRef<NodeJS.Timeout | null>(null);

  // Navigation functions
  const navigateNext = useCallback(() => {
    if (!selectedConversation || conversations.length === 0) return;

    const currentIndex = conversations.findIndex(c => c._id === selectedConversation._id);
    if (currentIndex < conversations.length - 1) {
      selectConversation(conversations[currentIndex + 1]);
    }
  }, [conversations, selectedConversation, selectConversation]);

  const navigatePrevious = useCallback(() => {
    if (!selectedConversation || conversations.length === 0) return;

    const currentIndex = conversations.findIndex(c => c._id === selectedConversation._id);
    if (currentIndex > 0) {
      selectConversation(conversations[currentIndex - 1]);
    }
  }, [conversations, selectedConversation, selectConversation]);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Don't trigger if user is typing in input/textarea
    const target = event.target as HTMLElement;
    const isTyping = ['INPUT', 'TEXTAREA'].includes(target.tagName) ||
      target.isContentEditable;

    if (isTyping && !event.ctrlKey && !event.metaKey) {
      return;
    }

    const key = event.key.toLowerCase();

    switch (key) {
      // Compose new email
      // case 'c':
      //   if (!isTyping) {
      //     event.preventDefault();
      //     setComposeOpen(true);
      //   }
      //   break;

      // Reply
      // case 'r':
      //   if (!isTyping && selectedConversation) {
      //     event.preventDefault();
      //     // Trigger reply editor
      //     const replyEvent = new CustomEvent('email:reply', {
      //       detail: { email: selectedConversation },
      //     });
      //     window.dispatchEvent(replyEvent);
      //   }
      //   break;

      // // Reply all
      // case 'a':
      //   if (!isTyping && selectedConversation) {
      //     event.preventDefault();
      //     const replyAllEvent = new CustomEvent('email:reply_all', {
      //       detail: { email: selectedConversation },
      //     });
      //     window.dispatchEvent(replyAllEvent);
      //   }
      //   break;

      // // Forward
      // case 'f':
      //   if (!isTyping && selectedConversation) {
      //     event.preventDefault();
      //     const forwardEvent = new CustomEvent('email:forward', {
      //       detail: { email: selectedConversation },
      //     });
      //     window.dispatchEvent(forwardEvent);
      //   }
      //   break;

      // // Archive
      // case 'e':
      //   if (!isTyping && selectedConversation) {
      //     event.preventDefault();
      //     const archiveEvent = new CustomEvent('email:archive', {
      //       detail: { emailId: selectedConversation._id },
      //     });
      //     window.dispatchEvent(archiveEvent);
      //   }
      //   break;

      // // Star/unstar
      // case 's':
      //   if (!isTyping && selectedConversation) {
      //     event.preventDefault();
      //     const starEvent = new CustomEvent('email:toggle_star', {
      //       detail: { emailId: selectedConversation._id },
      //     });
      //     window.dispatchEvent(starEvent);
      //     // Update local state immediately for instant feedback
      //     updateConversation(selectedConversation._id, {
      //       ...selectedConversation,
      //       // Toggle flagged status (assuming this is how stars are tracked)         
      //     });
      //   }
      //   break;

      // // Snooze
      // case 'z':
      //   if (!isTyping && selectedConversation) {
      //     event.preventDefault();
      //     const snoozeEvent = new CustomEvent('email:snooze', {
      //       detail: { emailId: selectedConversation._id },
      //     });
      //     window.dispatchEvent(snoozeEvent);
      //   }
      //   break;

      // "g" key for combo shortcuts
      case 'g':
        if (!isTyping) {
          event.preventDefault();
          gPressed.current = true;
          // Reset after 1 second
          if (gTimeout.current) clearTimeout(gTimeout.current);
          gTimeout.current = setTimeout(() => {
            gPressed.current = false;
          }, 1000);
        }
        break;

      // Go to Inbox (g+i)
      case 'i':
        if (!isTyping && gPressed.current) {
          event.preventDefault();
          setCurrentView('inbox');
          setFilters({ status: 'incoming' });
          gPressed.current = false;
        }
        break;

      // Go to Sent (g+s is already "s" for star, so using g+t for sent)
      case 't':
        if (!isTyping && gPressed.current) {
          event.preventDefault();
          setCurrentView('sent');
          setFilters({ status: 'outgoing' });
          gPressed.current = false;
        }
        break;

      // Show keyboard shortcuts help
      case '?':
        if (!isTyping) {
          event.preventDefault();
          const helpEvent = new CustomEvent('email:show_shortcuts');
          window.dispatchEvent(helpEvent);
        }
        break;

      // Next conversation
      case 'j':
        if (!isTyping) {
          event.preventDefault();
          navigateNext();
        }
        break;

      // Previous conversation
      case 'k':
        if (!isTyping) {
          event.preventDefault();
          navigatePrevious();
        }
        break;

      // Focus search
      case '/':
        if (!isTyping) {
          event.preventDefault();
          const searchInput = document.querySelector<HTMLInputElement>('[data-email-search]');
          searchInput?.focus();
        }
        break;

      // Send email (Ctrl/Cmd + Enter)
      case 'enter':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          const sendEvent = new CustomEvent('email:send');
          window.dispatchEvent(sendEvent);
        }
        break;

      // Escape (close modals/panels)
      case 'escape':
        event.preventDefault();
        const escapeEvent = new CustomEvent('email:escape');
        window.dispatchEvent(escapeEvent);
        break;

      default:
        // No action for other keys
        break;
    }
  }, [
    selectedConversation,
    conversations,
    selectConversation,
    setComposeOpen,
    setCurrentView,
    setFilters,
    updateConversation,
    navigateNext,
    navigatePrevious,
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  return {
    navigateNext,
    navigatePrevious,
  };
}

