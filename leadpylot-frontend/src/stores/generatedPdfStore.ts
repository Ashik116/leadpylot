import { create } from 'zustand';

interface GeneratedPdfState {
    isOpen: boolean;
    pdfData: any | null;
    assignedPdfData: any | null; // New field for assigned PDF data
    openModal: (data?: any) => void;
    closeModal: () => void;
    setPdfData: (data: any) => void;
    setAssignedPdfData: (data: any) => void; // New method for assigned PDF
    clearAssignedPdfData: () => void; // Method to clear assigned PDF data
}

export const useGeneratedPdfStore = create<GeneratedPdfState>((set) => ({
    isOpen: false,
    pdfData: null,
    assignedPdfData: null,
    openModal: (data?: any) => set({ isOpen: true, pdfData: data || null }),
    closeModal: () => set({ isOpen: false, pdfData: null }),
    setPdfData: (data: any) => set({ pdfData: data }),
    setAssignedPdfData: (data: any) => set({ assignedPdfData: data }),
    clearAssignedPdfData: () => set({ assignedPdfData: null }),
}));
