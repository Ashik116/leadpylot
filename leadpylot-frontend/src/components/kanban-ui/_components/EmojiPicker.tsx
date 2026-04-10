import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

const EMOJI_CATEGORIES = {
  'Frequently Used': ['😀', '😂', '😍', '🥰', '😎', '🤔', '👍', '❤️', '🔥', '💯'],
  'Smileys & People': [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
    '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
    '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
    '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
    '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
  ],
  'Gestures': ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤏', '👈', '👉', '👆', '👇', '☝️', '👋', '🤚', '🖐'],
  'Objects': ['💻', '📱', '⌚', '📷', '🎥', '📹', '📺', '📻', '🎙️', '🎚️', '🎛️', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌'],
  'Symbols': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️'],
};

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ isOpen, onClose, onSelect, triggerRef }) => {
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        !triggerRef?.current?.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full right-0 mb-2 w-[320px] rounded-lg border border-gray-300 bg-white shadow-xl z-50"
    >
      <div className="flex items-center justify-between border-b border-gray-200 p-3">
        <h3 className="text-sm font-semibold text-gray-900">Emoji</h3>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-[300px] overflow-y-auto p-3">
        {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
          <div key={category} className="mb-4 last:mb-0">
            <h4 className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">{category}</h4>
            <div className="grid grid-cols-8 gap-1">
              {emojis.map((emoji, idx) => (
                <button
                  key={`${category}-${idx}`}
                  onClick={() => {
                    onSelect(emoji);
                    onClose();
                  }}
                  className="rounded-md p-2 text-lg transition-colors hover:bg-gray-100 active:scale-95"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
