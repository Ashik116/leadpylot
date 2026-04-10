'use client';

import { useState, useRef } from 'react';
import { Mic, Upload, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import { useTranscribeAudio } from '@/hooks/leadbot/useTranscribeAudio';
import { useTranscribeStatus } from '@/hooks/leadbot/useTranscribeStatus';

const ACCEPT = 'audio/*,.mp3,.wav,.m4a,.ogg,.flac,.webm,.mp4';
const MAX_SIZE_MB = 100;

export function LeadbotAudioTranscribe() {
  const [file, setFile] = useState<File | null>(null);
  const [translate, setTranslate] = useState(false);
  const [diarize, setDiarize] = useState(false);
  const [summary, setSummary] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { transcribe, isTranscribing, error, reset } = useTranscribeAudio();
  const { isAvailable, isLoading: statusLoading } = useTranscribeStatus();
  const [result, setResult] = useState<{ text: string; metadata?: Record<string, unknown> } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.size <= MAX_SIZE_MB * 1024 * 1024) {
      setFile(selected);
      setResult(null);
      reset();
    }
    e.target.value = '';
  };

  const handleTranscribe = async () => {
    if (!file) return;
    try {
      const data = await transcribe({
        file,
        translate,
        diarize,
        summary,
      });
      setResult(data);
    } catch {
      // Error handled by hook
    }
  };

  const handleClear = () => {
    setFile(null);
    setResult(null);
    reset();
  };

  if (statusLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isAvailable) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <Mic className="mb-4 h-12 w-12 text-gray-400" />
        <p className="text-sm text-gray-600">Transcription service is not available.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Upload audio file (max {MAX_SIZE_MB} MB)
            </label>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              onChange={handleFileChange}
              className="hidden"
            />
            <div
              onClick={() => inputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white px-6 py-8 transition-colors hover:border-indigo-400 hover:bg-indigo-50/30"
            >
              <Upload className="mb-2 h-10 w-10 text-gray-400" />
              <p className="text-sm text-gray-600">Click to select audio file</p>
              <p className="mt-1 text-xs text-gray-500">MP3, WAV, M4A, OGG, FLAC, WebM, MP4</p>
            </div>
          </div>

          {file && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{file.name}</span>
                <Button variant="solid" size="sm" onClick={handleTranscribe} disabled={isTranscribing}>
                  {isTranscribing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Mic className="mr-1 h-4 w-4" />
                      Transcribe
                    </>
                  )}
                </Button>
                <Button variant="plain" size="sm" onClick={handleClear}>
                  Clear
                </Button>
              </div>

              <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-xs font-medium text-gray-700">Options</p>
                <label className="flex items-center gap-2">
                  <Checkbox checked={translate} onChange={(checked) => setTranslate(checked)} />
                  <span className="text-sm">Translate to English</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox checked={diarize} onChange={(checked) => setDiarize(checked)} />
                  <span className="text-sm">Speaker diarization</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox checked={summary} onChange={(checked) => setSummary(checked)} />
                  <span className="text-sm">Structured summary</span>
                </label>
              </div>
            </>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2">
              <p className="text-sm text-red-600">{(error as Error).message}</p>
            </div>
          )}

          {result && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h4 className="mb-2 text-sm font-semibold text-gray-800">Transcript</h4>
              <pre className="max-h-60 overflow-y-auto whitespace-pre-wrap break-words text-xs text-gray-700">
                {result.text}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
