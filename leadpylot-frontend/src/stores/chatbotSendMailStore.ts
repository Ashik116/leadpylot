import { create } from 'zustand';

type MaybeString = string | null | undefined;

export interface ChatbotComposeMailData {
  message_type?: string;
  subject: string;
  body: string;
  to?: string;
  cc?: string;
  bcc?: string;
  email_template_id?: string;
}

interface AssignmentModalState {
  mailData: ChatbotComposeMailData | null;
  isOpen: boolean;
  openComposeMailModal: (mail: unknown) => void;
  closeComposeMailModal: () => void;
  setMailData: (mail: unknown) => void;
}

function pickString(...values: MaybeString[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) return value;
  }
  for (const value of values) {
    if (typeof value === 'string') return value;
  }
  return '';
}

function pickOptionalString(...values: MaybeString[]): string | undefined {
  const value = pickString(...values).trim();
  return value || undefined;
}

export function normalizeChatbotMailData(mail: unknown): ChatbotComposeMailData | null {
  if (!mail || typeof mail !== 'object') return null;

  const draft = mail as Record<string, unknown>;

  return {
    message_type: pickOptionalString(draft.message_type as MaybeString),
    subject: pickString(draft.subject as MaybeString, draft.email_subject as MaybeString),
    body: pickString(
      draft.html_body as MaybeString,
      draft.body as MaybeString,
      draft.email_body as MaybeString
    ),
    to: pickOptionalString(draft.to as MaybeString, draft.to_email as MaybeString),
    cc: pickOptionalString(draft.cc as MaybeString),
    bcc: pickOptionalString(draft.bcc as MaybeString),
    email_template_id: pickOptionalString(draft.email_template_id as MaybeString),
  };
}

export const chatbotSendMailStore = create<AssignmentModalState>((set, get) => ({
  mailData: null,
  isOpen: false,

  openComposeMailModal: (mail: unknown) => {
    const currentState = get();
    if (currentState.isOpen) {
      return;
    }

    set({
      mailData: normalizeChatbotMailData(mail),
      isOpen: true,
    });
  },

  closeComposeMailModal: () => {
    set({
      mailData: null,
      isOpen: false,
    });
  },

  setMailData: (mail: unknown) => {
    set({ mailData: normalizeChatbotMailData(mail) });
  },
}));
