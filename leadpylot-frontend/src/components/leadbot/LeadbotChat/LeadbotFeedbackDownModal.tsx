'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';

interface LeadbotFeedbackDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (correction: string) => void;
}

export function LeadbotFeedbackDownModal({
  isOpen,
  onClose,
  onSubmit,
}: LeadbotFeedbackDownModalProps) {
  const [text, setText] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={() => {
          setText('');
          onClose();
        }}
      />
      <div
        className="relative z-10 w-full max-w-sm rounded-lg border border-gray-200 bg-white p-4 text-sm shadow-lg"
        role="dialog"
        aria-labelledby="feedback-down-title"
      >
        <h3 id="feedback-down-title" className="mb-2 font-medium text-gray-900">
          What could be improved?
        </h3>
        <p className="mb-2 text-gray-500">Optional — helps us improve responses.</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="mb-3 w-full resize-none rounded border border-gray-300 p-2 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          placeholder="Describe the issue…"
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="plain"
            size="sm"
            type="button"
            onClick={() => {
              setText('');
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button
            variant="solid"
            size="sm"
            type="button"
            onClick={() => {
              onSubmit(text.trim());
              setText('');
              onClose();
            }}
          >
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}
