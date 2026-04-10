import { useState, useCallback } from 'react';

export type UseSelectAllApiOptions = {
  apiFn: (params: any) => Promise<any>;
  total: number;
  returnFullObjects?: boolean;
  idField?: string;
  apiParams?: Record<string, any>;
  responseDataField?: string;
};

export function useSelectAllApi<T>({
  apiFn,
  total,
  returnFullObjects = false,
  idField = '_id',
  apiParams = {},
  responseDataField,
}: UseSelectAllApiOptions) {
  const [selected, setSelected] = useState<readonly T[] | readonly string[]>([]);

  const handleSelectAll = useCallback(async () => {
    if (!total) return;
    const allDataResponse = await apiFn({
      ...apiParams,
      page: 1, // Always fetch from page 1
      limit: total,
    });

    const allData = Array.isArray(allDataResponse)
      ? allDataResponse
      : allDataResponse?.data || allDataResponse?.emails || [];

    if (returnFullObjects) {
      if (responseDataField) {
        setSelected(allData[`${responseDataField}`]);
      } else {
        setSelected(allData);
      }
    } else {
      if (responseDataField) {
        setSelected(allData[`${responseDataField}`].map((item: any) => item[idField]));
      } else {
        setSelected(allData.map((item: any) => item[idField]));
      }
    }
  }, [apiFn, apiParams, total, returnFullObjects, idField, responseDataField]);

  return {
    selected,
    setSelected,
    handleSelectAll,
  };
}
