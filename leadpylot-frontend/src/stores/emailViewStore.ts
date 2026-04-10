import { create } from 'zustand';
import type { EmailConversation } from '@/app/(protected-pages)/dashboards/mails/_types/email.types';

export interface EmailViewData {
  conversation: EmailConversation;
  slotTitle: string;
  slotDocuments: unknown[];
  offerId?: string;
  slotName?: string;
}

export interface EmailViewState {
  data: EmailViewData | null;
  openedFromDocumentSlotViewer: boolean;
  setEmailView: (
    conversation: EmailConversation,
    slotTitle: string,
    slotDocuments: unknown[],
    offerId?: string,
    slotName?: string
  ) => void;
  clearEmailView: () => void;
  setOpenedFromDocumentSlotViewer: (value: boolean) => void;
  hasEmailView: () => boolean;
}

export const useEmailViewStore = create<EmailViewState>((set, get) => ({
  data: null,
  openedFromDocumentSlotViewer: false,

  setEmailView: (conversation, slotTitle, slotDocuments, offerId, slotName) => {
    set({
      data: {
        conversation,
        slotTitle,
        slotDocuments: slotDocuments ?? [],
        offerId,
        slotName,
      },
    });
  },

  clearEmailView: () => {
    set({ data: null, openedFromDocumentSlotViewer: false });
  },

  setOpenedFromDocumentSlotViewer: (value) => {
    set({ openedFromDocumentSlotViewer: value });
  },

  hasEmailView: () => {
    return get().data !== null;
  },
}));
