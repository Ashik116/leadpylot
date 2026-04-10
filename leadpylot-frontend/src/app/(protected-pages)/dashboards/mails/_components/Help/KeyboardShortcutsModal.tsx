'use client';

/**
 * KeyboardShortcutsModal Component
 * Display all available keyboard shortcuts
 */

import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';

interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

const shortcutGroups = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['j'], description: 'Next conversation' },
      { keys: ['k'], description: 'Previous conversation' },
      { keys: ['g', 'i'], description: 'Go to Inbox' },
      { keys: ['g', 't'], description: 'Go to Sent' },
      { keys: ['/'], description: 'Focus search' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      // { keys: ['c'], description: 'Compose new email' },
      // { keys: ['r'], description: 'Reply' },
      // { keys: ['a'], description: 'Reply all' },
      // { keys: ['f'], description: 'Forward' },
      // { keys: ['e'], description: 'Archive' },
      // { keys: ['s'], description: 'Star/Unstar' },
      // { keys: ['z'], description: 'Snooze' },
      { keys: ['Ctrl', 'Enter'], description: 'Send email' },
      { keys: ['Esc'], description: 'Close dialog' },
    ],
  },
  {
    title: 'Other',
    shortcuts: [
      { keys: ['?'], description: 'Show keyboard shortcuts' },
    ],
  },
];

export default function KeyboardShortcutsModal({ onClose }: KeyboardShortcutsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-[1.164625rem] font-semibold text-gray-900 flex items-center">
              <ApolloIcon name="add-to-playlist"/>
              <span className="ml-2 select-none">Keyboard Shortcuts</span>
            </h2>
            <Button
              variant="plain"
              onClick={onClose}
              icon={<ApolloIcon name="cross" />}
                >
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-[0.8152375rem] font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
                  >
                    <span className="text-[0.8152375rem] text-gray-600">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex} className="flex gap-1 items-center">
                          {keyIndex > 0 && (
                            <span className="text-gray-400 text-[0.698775rem]">then</span>
                          )}
                          <kbd className="px-2 py-1 text-[0.698775rem] rounded bg-gray-100 text-gray-700 border border-gray-300 font-mono">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <Button variant="solid" onClick={onClose}>
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}

