import React, { useState, useEffect } from 'react';
import Select from '@/components/ui/Select';
import { useQuery } from '@tanstack/react-query';
import ApiService from '@/services/ApiService';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
// import useNotification from '@/utils/hooks/useNotification';

interface SelectComponentProps {
  apiUrl: string;
  queryKey: string;
  optLabelKey?: string;
  optValueKey?: string;
  value?: string | number;
  onChange: (value: string | number | undefined) => void;
  placeholder?: string;
  isClearable?: boolean;
  isDisabled?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  field?: { name: string };
}

const SelectComponent: React.FC<SelectComponentProps> = ({
  apiUrl,
  queryKey,
  optLabelKey = 'name',
  optValueKey = '_id',
  value,
  onChange,
  placeholder = 'Select option...',
  isClearable = true,
  isDisabled = false,
  size = 'md',
  field,
}) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingOption, setPendingOption] = useState<any>(null);
  // const { openNotification } = useNotification();

  // Fetch options from API
  const { data, isLoading } = useQuery<any>({
    queryKey: [queryKey],
    queryFn: () => {
      return ApiService.fetchDataWithAxios({
        url: apiUrl,
        method: 'get',
        params: {
          limit: 100, // Get more options
        },
      });
    },

    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
  // Process API data to create options
  const processApiData = () => {
    const apiData = data?.data || data?.banks || data || [];
    const dataArray = Array.isArray(apiData) ? apiData : [];
    return dataArray?.map((item: any) => ({
      label: item[optLabelKey] || 'Unknown',
      value: item[optValueKey] || '',
      ...item,
    }));
  };

  const selectOptions = processApiData();

  // Find default value based on current value prop
  const findDefaultValue = () => {
    if (!value) return undefined;

    // First, try to find in main options
    const defaultValue = selectOptions?.find((option) => option?.value === value);

    if (defaultValue) return defaultValue;
  };

  const defaultValue = findDefaultValue();

  // Force re-render when value changes
  useEffect(() => {
    if (value && data) {
      // Use setTimeout to defer state update outside of render cycle
      const timeoutId = setTimeout(() => {
        setRefreshKey((prev) => prev + 1);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [value, data]);

  const handleChange = (option: any) => {
    // Guard bank selection behavior only for bank field
    const isBankField = field?.name === 'bank_id';

    if (option && typeof option === 'object' && 'value' in option) {
      if (isBankField) {
        if (option?.state === 'blocked' || option?.state === 'stop') {
          setPendingOption(option);
          return;
        }
        onChange(option?.value);
      } else {
        onChange(option?.value);
      }
    } else {
      onChange(undefined);
    }
  };

  return (
    <>
      <Select
        key={refreshKey}
        id={`select-${field?.name || 'default'}`}
        className="w-full"
        classNamePrefix="react-select"
        isLoading={isLoading}
        options={selectOptions}
        value={defaultValue}
        onChange={handleChange}
        placeholder={placeholder}
        isClearable={isClearable}
        isDisabled={isDisabled}
        size={size}
        fileName={field?.name ? field?.name : undefined}
      />

      {/* Confirmation dialog for blocked banks */}
      <ConfirmDialog
        type="warning"
        isOpen={!!pendingOption}
        title={`Selected bank is ${pendingOption?.state}`}
        onCancel={() => {
          setPendingOption(null);
          onChange(undefined);
          setRefreshKey((prev) => prev + 1);
        }}
        onConfirm={() => {
          if (pendingOption && 'value' in pendingOption) {
            onChange(pendingOption?.value);
          }
          setPendingOption(null);
        }}
      >
        <p>Do you want to proceed?</p>
      </ConfirmDialog>
    </>
  );
};

export default SelectComponent;
