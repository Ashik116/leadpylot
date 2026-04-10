
export interface TgeneratedPdfData {
    generatedPdf: TGeneratedPdf
    previewUrl: string
    downloadUrl: string
    assignUrl: string
    filename: string
    fileSize: number
    autoPdfGeneration?: any;
    generation_type?: string;
    version?: number;
    _id?: string;
}

export interface TGeneratedPdf {
    _id: string
    template_id: string
    offer_id: string
    lead_id: string
    agent_id: string
    project_id: string
    filename: string
    file_size: number
    generation_type: string
    status: string
    email_status: TEmailStatus
    version: number
    visibility: string
    expires_at: any
    download_url: string
    generation_time_ms: any
    completed_at: string
    created_by: string
    createdAt: string
    updatedAt: string
}

export interface TEmailStatus {
    sent: boolean
    sent_at: any
    sent_to: any[]
    email_id: any
}

export interface TGeneratedPdfPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    generatedPdfData?: TgeneratedPdfData;
}
