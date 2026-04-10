import { LEADBOT_GENERATING_PLACEHOLDER } from '@/utils/leadbotStreamPlaceholders';

export type UploadProgressStepKey = 'read' | 'classify' | 'transcribe' | 'generate';

export type UploadProgressStep = {
  key: UploadProgressStepKey;
  title: string;
  status: 'pending' | 'active' | 'done';
};

/**
 * Multipart stream UI state (see STREAM_CHAT / stream-ui.html).
 * Shown instead of a single "Thinking…" line while uploads / transcription run.
 */
export type UploadProgressState = {
  steps: UploadProgressStep[];
  /** When set, overrides the generate step title (tool phases from SSE). */
  generatingDetail?: string | null;
};

function step(
  key: UploadProgressStepKey,
  title: string,
  status: UploadProgressStep['status']
): UploadProgressStep {
  return { key, title, status };
}

/** Step order per reference UI: documents → classify → audio → generate. */
export function buildUploadProgressState(hasDocuments: boolean, hasAudio: boolean): UploadProgressState {
  const steps: UploadProgressStep[] = [];

  if (hasDocuments) {
    steps.push(step('read', 'Reading documents…', 'pending'));
    steps.push(step('classify', 'Classifying documents…', 'pending'));
  }
  if (hasAudio) {
    steps.push(step('transcribe', 'Transcribing audio…', 'pending'));
  }
  steps.push(step('generate', LEADBOT_GENERATING_PLACEHOLDER, 'pending'));

  if (hasDocuments) {
    const read = steps.find((s) => s.key === 'read');
    if (read) read.status = 'active';
  } else if (hasAudio) {
    const tr = steps.find((s) => s.key === 'transcribe');
    if (tr) tr.status = 'active';
  } else {
    const gen = steps.find((s) => s.key === 'generate');
    if (gen) gen.status = 'active';
  }

  return { steps, generatingDetail: null };
}

function withSteps(prev: UploadProgressState, nextSteps: UploadProgressStep[]): UploadProgressState {
  return { ...prev, steps: nextSteps };
}

export function applyFileUploadingSse(
  prev: UploadProgressState,
  status: 'reading' | 'analysing' | 'classifying' | 'classified' | 'done',
  hasAudio: boolean
): UploadProgressState {
  const hasRead = prev.steps.some((s) => s.key === 'read');
  const hasClassify = prev.steps.some((s) => s.key === 'classify');
  const hasTr = prev.steps.some((s) => s.key === 'transcribe');

  let steps = prev.steps.map((s) => ({ ...s }));

  const setStatus = (key: UploadProgressStepKey, st: UploadProgressStep['status']) => {
    const i = steps.findIndex((s) => s.key === key);
    if (i >= 0) steps[i] = { ...steps[i], status: st };
  };

  switch (status) {
    case 'reading':
      if (hasRead) {
        const i = steps.findIndex((s) => s.key === 'read');
        if (i >= 0) steps[i] = { ...steps[i], title: 'Reading documents…', status: 'active' };
      }
      break;
    case 'analysing':
      if (hasRead) {
        const i = steps.findIndex((s) => s.key === 'read');
        if (i >= 0) steps[i] = { ...steps[i], title: 'Analysing document…', status: 'active' };
      }
      break;
    case 'classifying':
      if (hasRead) setStatus('read', 'done');
      if (hasClassify) {
        const i = steps.findIndex((s) => s.key === 'classify');
        if (i >= 0) steps[i] = { ...steps[i], title: 'Classifying documents…', status: 'active' };
      }
      break;
    case 'classified':
      if (hasClassify) setStatus('classify', 'done');
      break;
    case 'done':
      if (hasRead) setStatus('read', 'done');
      if (hasClassify) setStatus('classify', 'done');
      if (hasAudio && hasTr) {
        const tr = steps.find((s) => s.key === 'transcribe');
        if (tr && tr.status !== 'done') {
          setStatus('transcribe', 'active');
        } else {
          setStatus('generate', 'active');
        }
      } else {
        setStatus('generate', 'active');
      }
      break;
    default:
      break;
  }

  return withSteps(prev, steps);
}

export function applyAudioTranscribingSse(
  prev: UploadProgressState,
  phase: 'start' | 'done'
): UploadProgressState {
  const steps = prev.steps.map((s) => ({ ...s }));
  const trIdx = steps.findIndex((s) => s.key === 'transcribe');
  const genIdx = steps.findIndex((s) => s.key === 'generate');

  if (phase === 'start' && trIdx >= 0) {
    steps[trIdx] = { ...steps[trIdx], status: 'active' };
  }
  if (phase === 'done') {
    if (trIdx >= 0) steps[trIdx] = { ...steps[trIdx], status: 'done' };
    if (genIdx >= 0) steps[genIdx] = { ...steps[genIdx], status: 'active' };
  }

  return { ...prev, steps };
}

/** Mark all steps before `generate` done and generate active (e.g. on llm_start). */
export function activateGenerateStep(prev: UploadProgressState): UploadProgressState {
  const steps = prev.steps.map((s) => {
    if (s.key === 'generate') return { ...s, status: 'active' as const };
    if (s.key === 'read' || s.key === 'classify' || s.key === 'transcribe')
      return { ...s, status: 'done' as const };
    return s;
  });
  return { ...prev, steps };
}
