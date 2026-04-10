'use client';

import { useState, useRef } from 'react';
import { Mail, Loader2, ChevronDown, ChevronUp, FileText, Upload } from 'lucide-react';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import { useClassifyEmail } from '@/hooks/leadbot/useClassifyEmail';
import { useExtractDocument } from '@/hooks/leadbot/useExtractDocument';
import type {
  LeadbotClassifyEmailRequest,
  LeadbotClassifyEmailResponse,
  LeadbotExtractDocumentResponse,
} from '@/types/leadbot.types';

const ACCEPT_ATTACHMENTS = '.pdf,.png,.jpg,.jpeg,.webp';
const MAX_ATTACHMENT_SIZE_MB = 20;

export function LeadbotEmailClassifier() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [direction, setDirection] = useState<'incoming' | 'outgoing'>('incoming');
  const [isReply, setIsReply] = useState(false);
  const [parentSubject, setParentSubject] = useState('');
  const [parentSlot, setParentSlot] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [extractedAttachments, setExtractedAttachments] = useState<
    LeadbotExtractDocumentResponse[] | null
  >(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const { classify, isClassifying, error, reset } = useClassifyEmail();
  const { extract, isExtracting, error: extractError, reset: resetExtract } = useExtractDocument();
  const [result, setResult] = useState<LeadbotClassifyEmailResponse | null>(null);

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const maxBytes = MAX_ATTACHMENT_SIZE_MB * 1024 * 1024;
    const valid = selected.filter((f) => f.size <= maxBytes);
    setAttachmentFiles(valid);
    setExtractedAttachments(null);
    resetExtract();
    e.target.value = '';
  };

  const handleExtract = async () => {
    if (attachmentFiles.length === 0) return;
    try {
      const data = await extract(attachmentFiles);
      setExtractedAttachments([data]);
    } catch {
      // Error handled by hook
    }
  };

  const handleClassify = async () => {
    if (!subject.trim() || !body.trim()) return;
    const payload: LeadbotClassifyEmailRequest = {
      subject: subject.trim(),
      body: body.trim(),
      direction,
      is_reply: isReply,
    };
    if (isReply) {
      if (parentSubject.trim()) payload.parent_subject = parentSubject.trim();
      if (parentSlot.trim()) payload.parent_slot = parentSlot.trim();
    }
    if (extractedAttachments?.length) {
      payload.attachments = extractedAttachments;
    }
    try {
      const data = await classify(payload);
      setResult(data);
    } catch {
      // Error handled by hook
    }
  };

  const handleClear = () => {
    setSubject('');
    setBody('');
    setParentSubject('');
    setParentSlot('');
    setAttachmentFiles([]);
    setExtractedAttachments(null);
    setResult(null);
    reset();
    resetExtract();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email body content"
              className="min-h-[120px] w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              rows={5}
            />
          </div>

          {/* Advanced options */}
          <div className="rounded-lg border border-gray-200 bg-white">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Advanced
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </button>
            {showAdvanced && (
              <div className="space-y-3 border-t border-gray-100 px-3 py-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Direction</label>
                  <div className="flex gap-4">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="direction"
                        checked={direction === 'incoming'}
                        onChange={() => setDirection('incoming')}
                        className="h-3.5 w-3.5 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm">Incoming</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="direction"
                        checked={direction === 'outgoing'}
                        onChange={() => setDirection('outgoing')}
                        className="h-3.5 w-3.5 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm">Outgoing</span>
                    </label>
                  </div>
                </div>
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox checked={isReply} onChange={(checked) => setIsReply(checked)} />
                  <span className="text-sm">Is reply</span>
                </label>
                {isReply && (
                  <div className="space-y-2 pl-6">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Parent subject
                      </label>
                      <input
                        type="text"
                        value={parentSubject}
                        onChange={(e) => setParentSubject(e.target.value)}
                        placeholder="Subject of parent email"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Parent slot
                      </label>
                      <input
                        type="text"
                        value={parentSlot}
                        onChange={(e) => setParentSlot(e.target.value)}
                        placeholder="Slot of parent email"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}

                {/* Attachments (extract → classify) */}
                <div className="space-y-2 border-t border-gray-100 pt-3">
                  <label className="block text-xs font-medium text-gray-600">
                    Attachments (extract for classification)
                  </label>
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    accept={ACCEPT_ATTACHMENTS}
                    multiple
                    onChange={handleAttachmentChange}
                    className="hidden"
                  />
                  <div
                    onClick={() => attachmentInputRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 transition-colors hover:border-indigo-400 hover:bg-indigo-50/30"
                  >
                    <Upload className="mb-1 h-6 w-6 text-gray-400" />
                    <p className="text-xs text-gray-600">
                      {attachmentFiles.length > 0
                        ? `${attachmentFiles.length} file(s) selected`
                        : 'Click to upload PDF or image'}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Max {MAX_ATTACHMENT_SIZE_MB} MB each
                    </p>
                  </div>
                  {attachmentFiles.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="solid"
                        size="xs"
                        onClick={handleExtract}
                        disabled={isExtracting}
                      >
                        {isExtracting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <FileText className="mr-1 h-3 w-3" />
                            Extract
                          </>
                        )}
                      </Button>
                      <Button
                        variant="plain"
                        size="xs"
                        onClick={() => {
                          setAttachmentFiles([]);
                          setExtractedAttachments(null);
                          resetExtract();
                        }}
                      >
                        Clear files
                      </Button>
                    </div>
                  )}
                  {extractedAttachments && (
                    <p className="text-xs text-green-600">
                      Extracted — will be included in classification
                    </p>
                  )}
                  {extractError && (
                    <p className="text-xs text-red-600">
                      {(extractError as Error).message}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="solid"
              size="sm"
              onClick={handleClassify}
              disabled={!subject.trim() || !body.trim() || isClassifying}
            >
              {isClassifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Mail className="mr-1 h-4 w-4" />
                  Classify
                </>
              )}
            </Button>
            <Button variant="plain" size="sm" onClick={handleClear}>
              Clear
            </Button>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2">
              <p className="text-sm text-red-600">{(error as Error).message}</p>
            </div>
          )}

          {result && (
            <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-4">
              <h4 className="text-sm font-semibold text-gray-800">Classification Result</h4>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Is opening:</span>
                  <span className="font-medium">{result.is_opening ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Slot:</span>
                  <span className="font-medium">{result.slot || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Stage:</span>
                  <span className="font-medium">{result.stage || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Suggested Agent:</span>
                  <span className="font-medium">{result.suggested_agent || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Confidence:</span>
                  <span className="font-medium">{(result.confidence * 100).toFixed(0)}%</span>
                </div>
                {result.situation_summary && (
                  <div className="mt-2 border-t border-gray-100 pt-2">
                    <span className="text-gray-600">Situation summary:</span>
                    <p className="mt-1 text-gray-700">{result.situation_summary}</p>
                  </div>
                )}
                {result.reason && (
                  <div className="mt-2 border-t border-gray-100 pt-2">
                    <span className="text-gray-600">Reason:</span>
                    <p className="mt-1 text-gray-700">{result.reason}</p>
                  </div>
                )}
                {result.attachment_slots &&
                  Array.isArray(result.attachment_slots) &&
                  result.attachment_slots.length > 0 && (
                    <div className="mt-2 border-t border-gray-100 pt-2">
                      <span className="text-gray-600">Attachment slots:</span>
                      <pre className="mt-1 max-h-24 overflow-y-auto text-xs text-gray-700">
                        {JSON.stringify(result.attachment_slots, null, 2)}
                      </pre>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
