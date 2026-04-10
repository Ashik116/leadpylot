import ApiService from './ApiService';

export interface CreateLostOfferRequest {
    offer_id: string;
}

export interface LostOffer {
    _id: string;
    offer_id: string;
    createdAt: string;
    updatedAt: string;
}

export interface LostOffersResponse {
    data: LostOffer[];
    meta: {
        total: number;
        page: number;
        limit: number;
    };
}

/**
 * Create a lost offer
 */
export const apiCreateLostOffer = async (data: CreateLostOfferRequest): Promise<LostOffer> => {
    const response = await ApiService.fetchDataWithAxios<LostOffer, CreateLostOfferRequest>({
        url: '/lost-offers',
        method: 'post',
        data,
    });
    return response;
};

/**
 * Bulk create lost offers
 */
export const apiBulkCreateLostOffers = async (offerIds: string[]): Promise<LostOffer[]> => {
    const promises = offerIds.map(offerId =>
        apiCreateLostOffer({ offer_id: offerId })
    );
    const results = await Promise.all(promises);
    return results;
};

/**
 * Get lost offers with pagination and filters
 */
export const apiGetLostOffers = async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}): Promise<LostOffersResponse> => {
    return await ApiService.fetchDataWithAxios<LostOffersResponse, {
        params: {
            page?: number;
            limit?: number;
            search?: string;
            sortBy?: string;
            sortOrder?: 'asc' | 'desc';
        }
    }>({
        url: '/lost-offers',
        method: 'get',
        params,
    });
};

/**
 * Get lost offer by ID
 */
export const apiGetLostOfferById = async (id: string): Promise<LostOffer> => {
    const response = await ApiService.fetchDataWithAxios<LostOffer, void>({
        url: `/lost-offers/${id}`,
        method: 'get',
    });
    return response;
};

/**
 * Update lost offer
 */
export const apiUpdateLostOffer = async (id: string, data: Partial<CreateLostOfferRequest>): Promise<LostOffer> => {
    const response = await ApiService.fetchDataWithAxios<LostOffer, Partial<CreateLostOfferRequest>>({
        url: `/lost-offers/${id}`,
        method: 'put',
        data,
    });
    return response;
};

/**
 * Delete lost offer
 */
export const apiDeleteLostOffer = async (id: string): Promise<void> => {
    return await ApiService.fetchDataWithAxios<void, void>({
        url: `/lost-offers/${id}`,
        method: 'delete',
    });
};
