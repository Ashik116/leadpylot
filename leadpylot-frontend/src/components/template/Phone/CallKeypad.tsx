import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ApolloIcon from '@/components/ui/ApolloIcon';
import React, { useState, useEffect, useRef } from 'react';
import { useSafeJsSIP, SessionState } from '@/hooks/useJsSIP';
import { useAgentAllExtensions } from '@/hooks/useAgentAllExtensions';
import { useSession } from '@/hooks/useSession';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useGlobalAdminSIP } from '@/hooks/useGlobalAdminSIP';

const CallKeypad = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dialedNumber, setDialedNumber] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [pastNumbers, setPastNumbers] = useState<string[]>([]);
  const [showPastNumbers, setShowPastNumbers] = useState(false);
  const [lastPressedKey, setLastPressedKey] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { sessions, makeCall, connections } = useSafeJsSIP();
  const { allExtensions, isLoading: extensionsLoading } = useAgentAllExtensions();
  const { data: session } = useSession();
  const { adminCredentials } = useGlobalAdminSIP();
  const isAdmin = session?.user?.role === Role.ADMIN;
  const [callError, setCallError] = useState<string | null>(null);
  const handleBackspace = () => {
    const input = inputRef.current;
    if (input) {
      const start = input.selectionStart;
      const end = input.selectionEnd;

      if (start !== null && end !== null && start !== end) {
        // If text is selected, remove the selected portion
        const beforeSelection = dialedNumber.substring(0, start);
        const afterSelection = dialedNumber.substring(end);
        setDialedNumber(beforeSelection + afterSelection);
        // Set cursor position to where selection started
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(start, start);
          }
        }, 0);
      } else if (start !== null && start > 0) {
        // If no selection but cursor is not at the beginning, remove character before cursor
        const beforeCursor = dialedNumber.substring(0, start - 1);
        const afterCursor = dialedNumber.substring(start);
        setDialedNumber(beforeCursor + afterCursor);
        // Set cursor position to where the character was removed
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(start - 1, start - 1);
          }
        }, 0);
      } else {
        // If cursor is at the beginning or no cursor position, remove the last character
        setDialedNumber((prev) => prev.slice(0, -1));
      }
    } else {
      // Fallback if input ref is not available
      setDialedNumber((prev) => prev.slice(0, -1));
    }
  };
  const handleSendCall = async () => {
    if (!dialedNumber.trim()) return;

    setPastNumbers((prev) =>
      [dialedNumber, ...prev.filter((num) => num !== dialedNumber)].slice(0, 10)
    );
    setCallError(null);

    const fromExt = isAdmin
      ? (adminCredentials.voip_username || '')
      : (allExtensions[0]?.extension || '');

    if (!fromExt) {
      setCallError('No VoIP extension configured. Set it in your user profile.');
      return;
    }

    const registeredConn = Array.from(connections.values()).find((c: any) => c.registered);
    if (!registeredConn) {
      setCallError('SIP not registered. Please wait or reconnect.');
      return;
    }

    try {
      await makeCall(registeredConn.extension, dialedNumber.trim());
      setDialedNumber('');
    } catch (error: any) {
      console.error('Call failed:', error);
      setCallError(error?.message || 'Call failed. Please try again.');
    }
  };
  const hasActiveCalls = Object.keys(sessions).filter((key) => {
    const session = sessions[key];
    return ![SessionState.Terminating, SessionState.Terminated].includes(session?.state);
  }).length > 0;

  const keypadButtons = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['*', '0', '#'],
    ['', '+', ''],
  ];

  // Auto-focus input when keypad is expanded and scroll to show the keypad
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
      // Scroll to show the expanded keypad
      setTimeout(() => {
        const keypadElement = document.querySelector('[data-keypad-container]');
        if (keypadElement) {
          keypadElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }, 100);
    }
  }, [isExpanded]);

  // Global keyboard listener for when keypad is expanded
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (!isExpanded) return;

      // Don't handle if user is typing in another input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = event.key;

      // Allow numbers 0-9
      if (/^[0-9]$/.test(key)) {
        event.preventDefault();
        const input = inputRef.current;
        if (input) {
          const cursorPosition = input.selectionStart;
          if (cursorPosition !== null) {
            // Insert the key at cursor position
            const beforeCursor = dialedNumber.substring(0, cursorPosition);
            const afterCursor = dialedNumber.substring(cursorPosition);
            setDialedNumber(beforeCursor + key + afterCursor);
            // Set cursor position after the inserted character
            setTimeout(() => {
              if (inputRef.current) {
                const newPosition = cursorPosition + 1;
                inputRef.current.setSelectionRange(newPosition, newPosition);
              }
            }, 0);
          } else {
            setDialedNumber((prev) => prev + key);
          }
        } else {
          setDialedNumber((prev) => prev + key);
        }
        setLastPressedKey(key);
      }
      // Allow special characters
      else if (['*', '#', '+', '-', '(', ')', ' '].includes(key)) {
        event.preventDefault();
        const input = inputRef.current;
        if (input) {
          const cursorPosition = input.selectionStart;
          if (cursorPosition !== null) {
            // Insert the key at cursor position
            const beforeCursor = dialedNumber.substring(0, cursorPosition);
            const afterCursor = dialedNumber.substring(cursorPosition);
            setDialedNumber(beforeCursor + key + afterCursor);
            // Set cursor position after the inserted character
            setTimeout(() => {
              if (inputRef.current) {
                const newPosition = cursorPosition + 1;
                inputRef.current.setSelectionRange(newPosition, newPosition);
              }
            }, 0);
          } else {
            setDialedNumber((prev) => prev + key);
          }
        } else {
          setDialedNumber((prev) => prev + key);
        }
        // Only set lastPressedKey for characters that exist on the keypad
        if (['*', '#', '+'].includes(key)) {
          setLastPressedKey(key);
        }
      }
      // Handle backspace
      else if (key === 'Backspace') {
        event.preventDefault();
        handleBackspace();
      }
      // Handle Enter key to send call
      else if (key === 'Enter') {
        event.preventDefault();
        if (dialedNumber.trim()) {
          handleSendCall();
        }
      }
      // Handle Escape key to clear
      else if (key === 'Escape') {
        event.preventDefault();
        setDialedNumber('');
      }
    };

    if (isExpanded) {
      document.addEventListener('keydown', handleGlobalKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isExpanded, dialedNumber]);

  // Clear the last pressed key after animation
  useEffect(() => {
    if (lastPressedKey) {
      const timer = setTimeout(() => {
        setLastPressedKey(null);
      }, 200); // Match the transition duration
      return () => clearTimeout(timer);
    }
  }, [lastPressedKey]);

  const handleKeypadClick = (key: string) => {
    const input = inputRef.current;
    if (input) {
      const cursorPosition = input.selectionStart;
      if (cursorPosition !== null) {
        // Insert the key at cursor position
        const beforeCursor = dialedNumber.substring(0, cursorPosition);
        const afterCursor = dialedNumber.substring(cursorPosition);
        setDialedNumber(beforeCursor + key + afterCursor);
        // Set cursor position after the inserted character
        setTimeout(() => {
          if (inputRef.current) {
            const newPosition = cursorPosition + 1;
            inputRef.current.setSelectionRange(newPosition, newPosition);
          }
        }, 0);
      } else {
        // Fallback: append to the end
        setDialedNumber((prev) => prev + key);
      }
    } else {
      // Fallback: append to the end
      setDialedNumber((prev) => prev + key);
    }
    setLastPressedKey(key);
  };

  const handleClear = () => {
    setDialedNumber('');
  };

  const handleHangup = () => {
    // TODO: Implement hangup logic
    console.log('Hanging up call');
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    // TODO: Implement actual mute logic
    console.log('Mute toggled:', !isMuted);
  };

  const handlePastNumberClick = (number: string) => {
    setDialedNumber(number);
    setShowPastNumbers(false);
  };

  // Handle keyboard input
  const handleKeyDown = (event: React.KeyboardEvent) => {
    const key = event.key;

    // Allow numbers 0-9
    if (/^[0-9]$/.test(key)) {
      event.preventDefault();
      const input = inputRef.current;
      if (input) {
        const cursorPosition = input.selectionStart;
        if (cursorPosition !== null) {
          // Insert the key at cursor position
          const beforeCursor = dialedNumber.substring(0, cursorPosition);
          const afterCursor = dialedNumber.substring(cursorPosition);
          setDialedNumber(beforeCursor + key + afterCursor);
          // Set cursor position after the inserted character
          setTimeout(() => {
            if (inputRef.current) {
              const newPosition = cursorPosition + 1;
              inputRef.current.setSelectionRange(newPosition, newPosition);
            }
          }, 0);
        } else {
          setDialedNumber((prev) => prev + key);
        }
      } else {
        setDialedNumber((prev) => prev + key);
      }
      setLastPressedKey(key);
    }
    // Allow special characters
    else if (['*', '#', '+', '-', '(', ')', ' '].includes(key)) {
      event.preventDefault();
      const input = inputRef.current;
      if (input) {
        const cursorPosition = input.selectionStart;
        if (cursorPosition !== null) {
          // Insert the key at cursor position
          const beforeCursor = dialedNumber.substring(0, cursorPosition);
          const afterCursor = dialedNumber.substring(cursorPosition);
          setDialedNumber(beforeCursor + key + afterCursor);
          // Set cursor position after the inserted character
          setTimeout(() => {
            if (inputRef.current) {
              const newPosition = cursorPosition + 1;
              inputRef.current.setSelectionRange(newPosition, newPosition);
            }
          }, 0);
        } else {
          setDialedNumber((prev) => prev + key);
        }
      } else {
        setDialedNumber((prev) => prev + key);
      }
      // Only set lastPressedKey for characters that exist on the keypad
      if (['*', '#', '+'].includes(key)) {
        setLastPressedKey(key);
      }
    }
    // Handle backspace
    else if (key === 'Backspace') {
      event.preventDefault();
      handleBackspace();
    }
    // Handle Enter key to send call
    else if (key === 'Enter') {
      event.preventDefault();
      if (dialedNumber.trim()) {
        handleSendCall();
      }
    }
    // Handle Escape key to clear
    else if (key === 'Escape') {
      event.preventDefault();
      setDialedNumber('');
    }
  };

  // Handle paste functionality
  const handlePaste = async (event: React.ClipboardEvent) => {
    event.preventDefault();
    try {
      const pastedText = await navigator.clipboard.readText();
      // Clean the pasted text to only allow numbers and special characters
      const cleanedText = pastedText.replace(/[^0-9*#+\-() ]/g, '');
      if (cleanedText) {
        setDialedNumber((prev) => prev + cleanedText);
      }
    } catch {
      // Fallback for older browsers or when clipboard access is denied
      const pastedText = event.clipboardData.getData('text');
      const cleanedText = pastedText.replace(/[^0-9*#+\-() ]/g, '');
      if (cleanedText) {
        setDialedNumber((prev) => prev + cleanedText);
      }
    }
  };

  // Handle paste button click
  const handlePasteClick = async () => {
    try {
      const pastedText = await navigator.clipboard.readText();
      // Clean the pasted text to only allow numbers and special characters
      const cleanedText = pastedText.replace(/[^0-9*#+\-() ]/g, '');
      if (cleanedText) {
        const input = inputRef.current;
        if (input) {
          const start = input.selectionStart;
          const end = input.selectionEnd;

          if (start !== null && end !== null && start !== end) {
            // If text is selected, replace the selection
            const beforeSelection = dialedNumber.substring(0, start);
            const afterSelection = dialedNumber.substring(end);
            setDialedNumber(beforeSelection + cleanedText + afterSelection);
            // Set cursor position after pasted text
            setTimeout(() => {
              if (inputRef.current) {
                const newPosition = start + cleanedText.length;
                inputRef.current.setSelectionRange(newPosition, newPosition);
              }
            }, 0);
          } else {
            // If no selection, append to the end
            setDialedNumber((prev) => prev + cleanedText);
          }
        } else {
          setDialedNumber((prev) => prev + cleanedText);
        }
      }
    } catch {
      // Show a message that paste is not available
      console.log('Clipboard access not available');
    }
  };

  return (
    <Card
      className="mt-4 overflow-hidden"
      header={{
        content: (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="from-ocean-500 bg-sand-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r shadow-lg">
                <ApolloIcon name="phone" className="text-sm text-white" />
              </div>
              <div>
                <h4 className="text-sand-1 m-0 text-lg font-semibold">Call Keypad</h4>
                <p className="text-sand-2 m-0 text-xs">Dial and manage calls</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsExpanded(!isExpanded)}
              className="from-sand-5 to-sand-4 border-sand-3 hover:from-sand-4 hover:to-sand-3 bg-sand-1 flex items-center gap-2 rounded-lg px-4 py-2 transition-all duration-200"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        ),
      }}
    >
      {!isExpanded ? (
        <div className="text-sand-3 py-8 text-center text-sm">
          <div className="from-sand-5 to-sand-4 mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r">
            <ApolloIcon name="phone" className="text-sand-2 text-xl" />
          </div>
          <p>Click expand to access the call keypad</p>
        </div>
      ) : (
        <div className="space-y-6 p-4" data-keypad-container>
          {/* Phone Number Display */}
          <div className="from-sand-6 to-sand-5 border-sand-3 rounded-xl border bg-gradient-to-br p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-evergreen h-2 w-2 animate-pulse rounded-full"></div>
                <span className="text-sand-1 text-sm font-medium">Phone Number</span>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handlePasteClick}
                  className="from-ocean-5 to-ocean-4 border-ocean-3 hover:from-ocean-4 hover:to-ocean-3 h-8 w-8 rounded-lg bg-gradient-to-r p-2 transition-all duration-200"
                  title="Paste number from clipboard"
                >
                  <ApolloIcon name="copy" className="text-ocean-2 text-xs" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleBackspace}
                  disabled={!dialedNumber}
                  className="from-sand-5 to-sand-4 border-sand-3 hover:from-sand-4 hover:to-sand-3 h-8 w-8 rounded-lg bg-gradient-to-r p-2 transition-all duration-200"
                >
                  <ApolloIcon name="arrow-left" className="text-sand-2 text-xs" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleClear}
                  disabled={!dialedNumber}
                  className="from-sand-5 to-sand-4 border-sand-3 hover:from-sand-4 hover:to-sand-3 h-8 w-8 rounded-lg bg-gradient-to-r p-2 transition-all duration-200"
                >
                  <ApolloIcon name="x" className="text-sand-2 text-xs" />
                </Button>
              </div>
            </div>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={dialedNumber}
                onChange={(e) => setDialedNumber(e.target.value)}
                placeholder="Type or click to enter number..."
                className="border-sand-3 focus:border-ocean-3 focus:ring-ocean-2/20 text-sand-1 text-md w-full rounded-xl border-2 bg-white p-4 pr-12 font-mono font-medium shadow-sm transition-all duration-200 focus:ring-2 focus:outline-none"
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowPastNumbers(!showPastNumbers)}
                className="from-ocean-5 to-ocean-4 border-ocean-3 hover:from-ocean-4 hover:to-ocean-3 absolute top-1/2 right-2 h-8 w-8 -translate-y-1/2 rounded-lg bg-gradient-to-r p-2 transition-all duration-200"
              >
                <ApolloIcon name="history" className="text-ocean-2 text-xs" />
              </Button>
            </div>

            {/* Past Numbers Dropdown */}
            {showPastNumbers && (
              <div className="border-sand-3 mt-3 max-h-32 overflow-y-auto rounded-lg border bg-white shadow-lg">
                {pastNumbers.length > 0 ? (
                  pastNumbers.map((number, index) => (
                    <div
                      key={index}
                      className="hover:bg-sand-4 text-sand-1 border-sand-4 flex cursor-pointer items-center justify-between border-b px-4 py-3 text-sm transition-colors last:border-b-0"
                      onClick={() => handlePastNumberClick(number)}
                    >
                      <span className="font-mono">{number}</span>
                      <div className="flex items-center gap-2">
                        <ApolloIcon name="phone" className="text-ocean-2 text-xs" />
                        <span className="text-ocean-2 text-xs font-medium">Click to dial</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sand-2 px-4 py-6 text-center text-sm">
                    <ApolloIcon name="history" className="text-sand-3 mx-auto mb-2 text-lg" />
                    No recent numbers to show
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error message */}
          {callError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {callError}
            </div>
          )}

          {/* Keypad */}
          <div className="from-sand-6 to-sand-5 border-sand-3 rounded-xl border bg-gradient-to-br p-5 shadow-sm">
            <div className="mb-4">
              <h5 className="text-sand-1 mb-2 text-sm font-medium">Dial Pad</h5>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {keypadButtons.map((row, rowIndex) => (
                <React.Fragment key={rowIndex}>
                  {row.map((key, keyIndex) =>
                    key ? (
                      <Button
                        key={`${rowIndex}-${keyIndex}`}
                        variant="secondary"
                        className={`to-sand-4 border-sand-3 text-sand-1 hover:from-sand-4 hover:to-sand-3 hover:border-ocean-3 hover:text-ocean-1 h-12 w-full rounded-xl border bg-gradient-to-br from-white text-lg font-semibold shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md ${
                          lastPressedKey === key
                            ? 'from-sand-4 to-sand-3 border-ocean-3 text-ocean-1 bg-sand-3 scale-105 shadow-md'
                            : ''
                        }`}
                        onClick={() => handleKeypadClick(key)}
                      >
                        {key}
                      </Button>
                    ) : (
                      <div key={`${rowIndex}-${keyIndex}`} className="h-12 w-full" />
                    )
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Call Control Buttons */}
          <div className="space-y-4">
            {/* Primary Call Actions */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="solid"
                className={`flex h-12 items-center justify-center rounded-xl font-semibold text-white shadow-lg transition-all duration-300 ${
                  hasActiveCalls
                    ? 'bg-gradient-to-r from-red-400 to-red-500 hover:scale-105 hover:from-red-500 hover:to-red-600 hover:shadow-xl'
                    : 'from-evergreen bg-gradient-to-r to-emerald-500 hover:scale-105 hover:from-emerald-500 hover:to-emerald-600 hover:shadow-xl'
                } ${!hasActiveCalls && !dialedNumber.trim() ? 'cursor-not-allowed opacity-50' : ''}`}
                onClick={hasActiveCalls ? handleHangup : handleSendCall}
                disabled={!hasActiveCalls && !dialedNumber.trim()}
              >
                <ApolloIcon name="phone" className="mr-2 text-lg" />
                {hasActiveCalls ? 'Hang Up' : 'Call Now'}
              </Button>

              <Button
                variant="secondary"
                className={`to-sand-4 border-sand-3 text-sand-1 hover:from-sand-4 hover:to-sand-3 hover:border-ocean-3 hover:text-ocean-1 flex h-12 items-center justify-center rounded-xl border bg-gradient-to-br from-white font-semibold shadow-md transition-all duration-300 ${
                  !hasActiveCalls
                    ? 'cursor-not-allowed opacity-50'
                    : 'hover:scale-105 hover:shadow-lg'
                }`}
                onClick={handleMuteToggle}
                disabled={!hasActiveCalls}
              >
                <ApolloIcon name="volume" className="mr-2 text-lg" />
                {isMuted ? 'Unmute' : 'Mute'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default CallKeypad;
