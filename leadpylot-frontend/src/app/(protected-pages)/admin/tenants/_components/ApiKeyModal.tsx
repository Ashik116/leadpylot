'use client';

import { useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { toast } from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  tenantName: string;
}

export default function ApiKeyModal({
  isOpen,
  onClose,
  apiKey,
  tenantName,
}: ApiKeyModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      toast.push(
        <Notification title="Copied" type="success">
          API key copied to clipboard
        </Notification>
      );
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.push(
        <Notification title="Error" type="danger">
          Failed to copy to clipboard
        </Notification>
      );
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} width={500}>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-100 rounded-full">
            <ApolloIcon name="key-inclined" className="text-2xl text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">New API Key Generated</h3>
            <p className="text-sm text-gray-500">{tenantName}</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <ApolloIcon name="alert-triangle" className="text-amber-500 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Important</p>
              <p className="text-sm text-amber-700">
                This API key will only be shown once. Make sure to copy and store it securely.
                You will not be able to see it again.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Key
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-100 p-3 rounded-lg text-sm font-mono break-all">
              {apiKey}
            </code>
            <Button
              variant={copied ? 'solid' : 'default'}
              size="sm"
              icon={<ApolloIcon name={copied ? 'check' : 'copy'} />}
              onClick={handleCopy}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="solid" onClick={onClose}>
            I&apos;ve Saved the Key
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
