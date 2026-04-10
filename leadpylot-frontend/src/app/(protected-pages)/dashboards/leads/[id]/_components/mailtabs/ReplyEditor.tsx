'use client';

import { useEffect, useRef, useState, ChangeEvent } from 'react';
import Button from '@/components/ui/Button/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import RichTextEditor from '@/components/shared/RichTextEditor';
import { useReplyToEmail } from '@/services/hooks/useEmailSystem';

type ReplyEditorProps = {
  isOpen: boolean;
  emailId?: string;
  onClose: () => void;
};

const ReplyEditor = ({ isOpen, emailId, onClose }: ReplyEditorProps) => {
  const [measuredHeight, setMeasuredHeight] = useState<number>(0);
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const replyMutation = useReplyToEmail();

  // Measure inner content to animate height smoothly (use scrollHeight to avoid clipping)
  useEffect(() => {
    const measure = () => {
      const el = innerRef.current;
      if (!el) return;
      const h = el.scrollHeight || el.offsetHeight || 0;
      setMeasuredHeight(h);
    };
    // initial measure
    measure();
    const ro = new ResizeObserver(measure);
    if (innerRef.current) ro.observe(innerRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  // Re-measure whenever content or files change or when opening
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const el = innerRef.current;
      if (!el) return;
      const h = el.scrollHeight || el.offsetHeight || 0;
      setMeasuredHeight(h);
    });
    return () => cancelAnimationFrame(id);
  }, [files.length, content, isOpen]);

  const onReset = () => {
    setContent('');
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = (payload: { emailId?: string; html: string; files: File[] }) => {
    if (!emailId || !content.trim()) return;
    replyMutation.mutate(
      {
        emailId: emailId,
        payload: {
          subject: `${emailId || 'Reply'}`,
          html: payload.html,
          attachments: payload.files,
        },
      },
      {
        onSuccess: () => {
          onClose();
          onReset();
        },
      }
    );
  };

  const handleAttachClick = () => fileInputRef.current?.click();

  const handleFilesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;
    const newFiles = Array.from(list);
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.name}-${f.size}-${f.lastModified}`));
      const merged = [...prev];
      newFiles.forEach((f) => {
        const key = `${f.name}-${f.size}-${f.lastModified}`;
        if (!existing.has(key)) merged.push(f);
      });
      return merged;
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!replyMutation.isPending) {
        handleSend({ emailId: emailId, html: content, files });
      }
    }
  };
  const GenerateShortName = (name: string) => {
    if (name.length <= 10) return name;
    const dotIndex = name.lastIndexOf('.');
    if (dotIndex === -1) return name;
    const namePart = name.slice(0, 5);
    const extension = name.slice(dotIndex);
    return namePart + '...' + extension;
  };
  return (
    <div
      className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
      style={{
        maxHeight: isOpen ? measuredHeight : 0,
        minHeight: isOpen && (files.length > 0 || content.trim().length > 0) ? undefined : 0,
      }}
    >
      <div ref={innerRef}>
        {/* Editor */}
        <div className="relative flex flex-col bg-white">
          <RichTextEditor
            editorContentClass="min-h-[140px]"
            content={content}
            onChange={({ html }) => setContent(html)}
            onKeyDown={handleEditorKeyDown}
          />
          <ApolloIcon
            name="minimize"
            className="absolute top-1 right-1 rounded-md bg-gray-900 p-1 text-white"
            onClick={onClose}
          />
          {/* Attachments */}
          <div className="mt-3 overflow-y-auto">
            {files.length > 0 && (
              <div className="mt-2 flex max-h-24 flex-wrap gap-2 overflow-y-auto rounded p-2 text-sm text-gray-700">
                {files.map((f, idx) => (
                  <div
                    key={`${f.name}-${idx}`}
                    className="bg-sand-3/30 text-ocean-2 inline-flex w-fit max-w-full items-center space-x-2 overflow-hidden rounded-sm px-2 py-2 font-semibold"
                  >
                    <p className="line-clamp-1" title={f.name}>
                      {GenerateShortName(f.name)}
                    </p>
                    <ApolloIcon
                      name="cross"
                      className="shrink-0 text-black transition-all hover:scale-150"
                      onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={handleFilesChange}
            />
            <Button
              variant="secondary"
              size="sm"
              icon={<ApolloIcon name="paperclip" className="h-4 w-4" />}
              onClick={handleAttachClick}
            >
              Attachments
            </Button>
            <Button
              variant="success"
              size="sm"
              icon={<ApolloIcon name="send-inclined" className="h-4 w-4" />}
              disabled={!content.trim() || replyMutation.isPending}
              loading={replyMutation.isPending}
              onClick={() => handleSend({ emailId: emailId, html: content, files })}
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplyEditor;
