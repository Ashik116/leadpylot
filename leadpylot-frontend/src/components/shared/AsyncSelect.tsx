import ReactSelect from 'react-select';
import CreatableSelect from 'react-select/creatable';
import AsyncSelect from 'react-select/async';

import type { Props as ReactSelectProps, GroupBase } from 'react-select';
import type { AsyncProps } from 'react-select/async';
import type { CreatableProps } from 'react-select/creatable';
import { useId, useState, useEffect, useRef } from 'react';
import { CommonProps } from '@/@types/common';
import { TypeAttributes } from '../ui/@types/common';
import Select from '@/components/ui/Select';
import { useQuery } from '@tanstack/react-query';
import ApiService from '@/services/ApiService';

export type SelectProps<
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
> = CommonProps &
  ReactSelectProps<Option, IsMulti, Group> &
  AsyncProps<Option, IsMulti, Group> &
  CreatableProps<Option, IsMulti, Group> & {
    invalid?: boolean;
    size?: TypeAttributes.ControlSize;
    field?: any;
    componentAs?: ReactSelect | CreatableSelect | AsyncSelect;
    api_url: string;
    optLabelKey?: string;
    optValueKey?: string;
    queryKey: string;
    searchKey?: string;
    sidebarVisible?: boolean;
  };

function AsyncSelectComponent<
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
>(props: SelectProps<Option, IsMulti, Group>) {
  const [refreshKey, setRefreshKey] = useState(0);
  const prevSidebarVisible = useRef(props.sidebarVisible);

  const id = useId();
  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: [props.queryKey],
    queryFn: () => {
      return ApiService.fetchDataWithAxios({
        url: props.api_url,
        method: 'get',
        params: {
          limit: 30,
          ...(props.searchKey ? { [props.searchKey]: '' } : {}),
        },
      });
    },
    // These options ensure we always get fresh data

    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Map API data to select options with improved logic
  // Handle different API response structures
  let apiData;
  if (props.queryKey === 'email_templates') {
    // Email templates API returns { templates: [...] } structure
    apiData = data?.data || [];
  } else {
    // Other APIs return { data: [...] } or [...] structures
    apiData = data?.data || data || [];
  }
  const dataArray = Array.isArray(apiData) ? apiData : [];

  const selectOptions: any[] = dataArray?.map((item: any) => ({
    label: item[props?.optLabelKey || 'name'],
    value: item[props?.optValueKey || '_id'],
  }));

  // Custom query to fetch specific item by ID if we have a value but no matching option
  const { data: specificItemData } = useQuery<any>({
    queryKey: [`${props?.queryKey}-specific`, props?.value],
    queryFn: () => {
      if (!props.value) return null;

      // Try to fetch the specific item by ID
      return ApiService.fetchDataWithAxios({
        url: `${props?.api_url}/${props?.value}`,
        method: 'get',
      });
    },
    enabled:
      !!props?.value &&
      !isLoading &&
      data &&
      selectOptions?.length > 0 &&
      !selectOptions?.some((option) => option?.value === props?.value),
  });

  // Effect to refetch data when sidebar visibility changes
  useEffect(() => {
    // If sidebar was visible and is now hidden (sidebar just closed)
    if (prevSidebarVisible.current && !props?.sidebarVisible) {
      // Force an immediate refetch of the data
      refetch();
      // Increment refresh key to force re-render
      setRefreshKey((prev) => prev + 1);
    }

    // Update previous sidebar visibility
    prevSidebarVisible.current = props?.sidebarVisible;
  }, [props.sidebarVisible, refetch]);

  // Effect to handle value changes (important for edit mode)
  useEffect(() => {
    if (props?.value && data) {
      // Force a re-render when value changes and we have data
      setRefreshKey((prev) => prev + 1);
    }
  }, [props?.value, data]);

  // Effect to fetch specific option data when we have a value but no matching option
  useEffect(() => {
    if (props?.value && !isLoading && data && selectOptions?.length > 0) {
      // Check if we have the value in our options
      const hasValue = selectOptions?.some((option) => option?.value === props?.value);

      if (!hasValue) {
        // We have a value but it's not in our current options
        // This could happen if the API response doesn't include the specific item
        console.log(
          'Value not found in current options, attempting to fetch specific item:',
          props?.value
        );

        // Force a refetch to get more data
        refetch();
      }
    }
  }, [props?.value, isLoading, data, selectOptions, refetch]);

  // Find and set default option based on current value prop
  let defaultValue = undefined;

  // First, try to find the option in the processed selectOptions
  if (props?.value && selectOptions?.length > 0) {
    defaultValue = selectOptions?.find((option) => option?.value === props?.value);
  }

  // If we have a value but no matching option yet, try to find it in raw API data
  if (props?.value && !defaultValue && data) {
    let rawData;
    if (props?.queryKey === 'email_templates') {
      rawData = data?.data || [];
    } else {
      rawData = data?.data || data || [];
    }

    const rawItem = Array.isArray(rawData)
      ? rawData.find((item: any) => item[props?.optValueKey || '_id'] === props.value)
      : null;

    if (rawItem) {
      defaultValue = {
        label: rawItem[props?.optLabelKey || 'name'],
        value: rawItem[props?.optValueKey || '_id'],
      };
    }
  }

  // If we still don't have a default value, try to use the specific item data
  if (props?.value && !defaultValue && specificItemData) {
    const specificItem = specificItemData?.data || specificItemData;
    if (specificItem && specificItem[props?.optValueKey || '_id'] === props?.value) {
      defaultValue = {
        label: specificItem[props?.optLabelKey || 'name'],
        value: specificItem[props?.optValueKey || '_id'],
      };
    }
  }

  // If we still don't have a default value but have a value prop, create a temporary option
  // This handles the case where the form has a value but the API hasn't loaded yet
  if (props?.value && !defaultValue) {
    defaultValue = {
      label: `Loading... (ID: ${props?.value})`,
      value: props?.value,
      isDisabled: true, // Disable this temporary option
    };
  }

  console.log('AsyncSelect Debug:', {
    fieldName: props?.field?.name || 'unknown',
    value: props?.value,
    valueType: typeof props?.value,
    defaultValue,
    defaultValueLabel: defaultValue?.label,
    defaultValueValue: defaultValue?.value,
    selectOptions: selectOptions?.length,
    hasData: !!data,
    hasSpecificData: !!specificItemData,
    isLoading,
    apiUrl: props?.api_url,
    queryKey: props?.queryKey,
  });
  const customStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      alignItems: 'flex-start',
      borderRadius: 10,
      borderColor: state?.isFocused ? '#c2c0bc' : provided?.borderColor,
      boxShadow: state?.isFocused ? '0 0 0 1px #c2c0bc' : provided?.boxShadow,
      '&:hover': {
        borderColor: '#c2c0bc',
      },
    }),
    valueContainer: (provided: any) => ({
      ...provided,
      flexWrap: 'wrap',
      paddingTop: 4,
      paddingBottom: 4,
    }),
    // Only modify the input to hide the text cursor
    input: (provided: any) => ({
      ...provided,
      caretColor: 'transparent',
      margin: 0,
      paddingTop: 0,
      paddingBottom: 0,
    }),
    multiValue: (provided: any) => ({
      ...provided,
      margin: 0,
    }),
  };

  return (
    <Select
      key={refreshKey} // Use refreshKey to force re-render when data changes
      id={id}
      className="w-full"
      classNamePrefix="react-select"
      isLoading={isLoading}
      options={selectOptions}
      value={defaultValue} // This shows the selected option
      styles={customStyles}
      size={props?.size || 'sm'} // Ensure consistent sizing
      {...props}
    />
  );
}

export default AsyncSelectComponent;
