import React from 'react';
import Skeleton from '@/components/ui/Skeleton';
import type { SkeletonProps } from '@/components/ui/Skeleton';

export interface FormPreloaderProps {
  showTitle?: boolean;
  titleWidth?: string | number;
  formFields?: string[]; // Field names/labels - simplified approach
  fieldGroups?: number[][]; // Indices of fields that should be grouped in flex rows

  showButtons?: boolean;
  buttonCount?: number;
  className?: string;
  skeletonProps?: SkeletonProps;
  inputHeight?: string | number;
  labelHeight?: string | number;
}

const FormPreloader = (props: FormPreloaderProps) => {
  const {
    showTitle = false,
    titleWidth = '200px',
    formFields = [],
    fieldGroups = [],
    showButtons = true,
    buttonCount = 2,
    className = '',
    skeletonProps,
    inputHeight = '35px',
    labelHeight = '14px',
  } = props;

  // Helper function to get label width based on field name
  const getLabelWidth = (fieldName: string): string => {
    return `${Math.max(fieldName.length * 8 + 20, 80)}px`;
  };

  const renderField = (fieldIndex: number, fieldName: string, isInGroup = false) => {
    const labelWidth = getLabelWidth(fieldName);

    return (
      <div key={fieldIndex} className={isInGroup ? '' : 'space-y-2'}>
        <Skeleton width={labelWidth} height={labelHeight} className="mb-1" {...skeletonProps} />
        <Skeleton width="100%" height={inputHeight} className="rounded-md" {...skeletonProps} />
      </div>
    );
  };

  const renderFields = () => {
    const rendered: React.ReactElement[] = [];
    const processedIndices = new Set<number>();

    // First, render grouped fields
    fieldGroups?.forEach((group, groupIndex) => {
      if (group?.length > 1) {
        const groupElement = (
          <div key={`group-${groupIndex}`} className="flex space-x-4">
            {group?.map((fieldIndex) => {
              processedIndices?.add(fieldIndex);
              return (
                <div key={fieldIndex} className="flex-1 space-y-2">
                  {renderField(
                    fieldIndex,
                    formFields[fieldIndex] || `Field ${fieldIndex + 1}`,
                    true
                  )}
                </div>
              );
            })}
          </div>
        );
        rendered.push(groupElement);
      }
    });

    // Then render individual fields that aren't in groups
    formFields?.forEach((fieldName, index) => {
      if (!processedIndices?.has(index)) {
        rendered.push(renderField(index, fieldName));
      }
    });

    return rendered;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {showTitle && (
        <Skeleton width={titleWidth} height="32px" className="font-semibold" {...skeletonProps} />
      )}

      <div className="space-y-4">{renderFields()}</div>

      {showButtons && (
        <div className="flex justify-end space-x-3">
          {Array?.from({ length: buttonCount })?.map((_, index) => (
            <Skeleton
              key={index}
              width="80px"
              height="40px"
              className="rounded-md"
              {...skeletonProps}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FormPreloader;
