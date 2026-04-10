'use client';

import { useState, useRef } from 'react';
import { FileText, Upload, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useExtractDocument } from '@/hooks/leadbot/useExtractDocument';

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp';
const MAX_SIZE_MB = 20;

export function LeadbotDocumentExtract() {
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { extract, isExtracting, error, reset } = useExtractDocument();
  const [result, setResult] = useState<{ full_text: string; fields?: Record<string, unknown> } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const valid = selected.filter((f) => f.size <= MAX_SIZE_MB * 1024 * 1024);
    setFiles(valid);
    setResult(null);
    reset();
    e.target.value = '';
  };

  const handleExtract = async () => {
    if (files.length === 0) return;
    try {
      const data = await extract(files);
      setResult(data);
    } catch {
      // Error handled by hook
    }
  };

  const handleClear = () => {
    setFiles([]);
    setResult(null);
    reset();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Upload PDF or image (max {MAX_SIZE_MB} MB each)
            </label>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <div
              onClick={() => inputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white px-6 py-8 transition-colors hover:border-indigo-400 hover:bg-indigo-50/30"
            >
              <Upload className="mb-2 h-10 w-10 text-gray-400" />
              <p className="text-sm text-gray-600">Click or drag files to upload</p>
              <p className="mt-1 text-xs text-gray-500">PDF, PNG, JPEG, WebP</p>
            </div>
          </div>

          {files.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{files.length} file(s) selected</span>
              <Button variant="solid" size="sm" onClick={handleExtract} disabled={isExtracting}>
                {isExtracting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <FileText className="mr-1 h-4 w-4" />
                    Extract Text
                  </>
                )}
              </Button>
              <Button variant="plain" size="sm" onClick={handleClear}>
                Clear
              </Button>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2">
              <p className="text-sm text-red-600">{(error as Error).message}</p>
            </div>
          )}

          {result && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h4 className="mb-2 text-sm font-semibold text-gray-800">Extracted Text</h4>
              <pre className="max-h-60 overflow-y-auto whitespace-pre-wrap break-words text-xs text-gray-700">
                {result.full_text}
              </pre>
              {result.fields && Object.keys(result.fields).length > 0 && (
                <div className="mt-3 border-t border-gray-200 pt-3">
                  <h4 className="mb-2 text-sm font-semibold text-gray-800">Fields</h4>
                  <pre className="text-xs text-gray-600">
                    {JSON.stringify(result.fields, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
