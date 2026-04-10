import { useState } from 'react';

const useClipboard = () => {
  const [copied, setCopied] = useState(false);
  const [clipboardText, setClipboardText] = useState('');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setClipboardText(text);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    });
  };

  return { copyToClipboard, copied, clipboardText };
};

export default useClipboard;
