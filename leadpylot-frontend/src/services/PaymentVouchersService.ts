import ApiService from './ApiService';

// Types
export interface PaymentVoucherFile {
    _id: string;
    document: {
        _id: string;
        filetype: string;
        filename: string;
        path: string;
        size: number;
        type: string;
        createdAt: string;
    };
}

export interface PaymentVoucherLead {
    _id: string;
    contact_name: string;
    email_from: string;
    phone: string;
    status: string;
    stage: string;
    display_name: string;
    assigned_agent: string;
    createdAt: string;
    updatedAt: string;
}

export interface PaymentVoucherOffer {
    _id: string;
    title: string;
    investment_volume: number;
    interest_rate: number;
    profit_percentage: number;
    status: string;
    payment_terms: {
        name: string;
        info: string;
    };
    bonus_amount: {
        name: string;
        info: string;
    };
    bank_id: {
        name: string;
        account_number: string;
        iban: string;
        swift_code: string;
        state: string;
        is_allow: boolean;
        is_default: boolean;
    };
    lead_id: PaymentVoucherLead;
    project_id: {
        name: string;
    };
    agent_id: {
        login: string;
        role: string;
        name: string;
        email: string;
    };
    files: any[];
    createdAt: string;
    updatedAt: string;
}

export interface PaymentVoucherOpening {
    _id: string;
    offer_id: PaymentVoucherOffer;
    files: any[];
    creator_id: {
        name: string;
        email: string;
        role: string;
    };
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface PaymentVoucherConfirmation {
    _id: string;
    opening_id: PaymentVoucherOpening;
    files: any[];
    creator_id: {
        name: string;
        email: string;
        role: string;
    };
    notes: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface PaymentVoucher {
    _id: string;
    confirmation_id: PaymentVoucherConfirmation;
    creator_id: {
        _id: string;
        name: string;
        email: string;
        role: string;
    };
    files: PaymentVoucherFile[];
    amount: number;
    notes: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
    // Flattened fields for easier access
    lead?: PaymentVoucherLead;
    offer?: PaymentVoucherOffer;
    opening?: PaymentVoucherOpening;
    confirmation?: PaymentVoucherConfirmation;
}

export interface PaymentVouchersResponse {
    data: PaymentVoucher[];
    meta: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

export interface GetPaymentVouchersParams {
    page?: number;
    limit?: number;
    confirmation_id?: string;
    showInactive?: boolean;
}

// API functions
export const apiGetPaymentVouchers = (params?: GetPaymentVouchersParams) => {
    return ApiService.fetchDataWithAxios<PaymentVouchersResponse>({
        url: '/payment-vouchers',
        method: 'get',
        params,
    });
};

export const apiGetPaymentVoucher = (id: string, showInactive?: boolean) => {
    return ApiService.fetchDataWithAxios<PaymentVoucher>({
        url: `/payment-vouchers/${id}`,
        method: 'get',
        params: {
            showInactive: showInactive ? 'true' : 'false',
        },
    });
};

export const apiCreatePaymentVoucher = (data: FormData) => {
    return ApiService.fetchDataWithAxios<PaymentVoucher>({
        url: '/payment-vouchers',
        method: 'post',
        data: data as unknown as Record<string, unknown>,
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

export const apiUpdatePaymentVoucher = (id: string, data: FormData) => {
    return ApiService.fetchDataWithAxios<PaymentVoucher>({
        url: `/payment-vouchers/${id}`,
        method: 'put',
        data: data as unknown as Record<string, unknown>,
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

export const apiAddDocumentsToPaymentVoucher = (id: string, data: FormData) => {
    return ApiService.fetchDataWithAxios<{ status: string; message: string; data: PaymentVoucher }>({
        url: `/payment-vouchers/${id}/documents`,
        method: 'post',
        data: data as unknown as Record<string, unknown>,
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

export const apiDeletePaymentVoucher = (id: string) => {
    return ApiService.fetchDataWithAxios<{ message: string; deletedPaymentVoucher: PaymentVoucher }>({
        url: `/payment-vouchers/${id}`,
        method: 'delete',
    });
};

export const apiRestorePaymentVoucher = (id: string) => {
    return ApiService.fetchDataWithAxios<{ message: string; restoredPaymentVoucher: PaymentVoucher }>({
        url: `/payment-vouchers/${id}/restore`,
        method: 'put',
    });
}; 