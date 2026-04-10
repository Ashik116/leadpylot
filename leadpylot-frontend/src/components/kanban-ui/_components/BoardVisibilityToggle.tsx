'use client';

import React from 'react';
import Checkbox from '@/components/ui/Checkbox';
import { Eye, EyeOff } from 'lucide-react';
import { UseFormRegisterReturn, UseFormSetValue, FieldError } from 'react-hook-form';

interface BoardVisibilityToggleProps {
    value: boolean;
    isSubmitting?: boolean;
    register: UseFormRegisterReturn;
    setValue: UseFormSetValue<any>;
    error?: FieldError;
}

export const BoardVisibilityToggle: React.FC<BoardVisibilityToggleProps> = ({
    value,
    isSubmitting = false,
    register,
    setValue,
    error,
}) => {
    return (
        <div className="mb-6">
            <div
                onClick={() => !isSubmitting && setValue('onlyMe', !value)}
                className={`
          flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
          ${value
                        ? 'border-ocean-2 bg-ocean-2/5'
                        : 'border-gray-200 bg-gray-50 hover:border-ocean-2/50'
                    }
          ${isSubmitting ? 'cursor-not-allowed opacity-50' : ''}
        `}
            >
                <div className={`
          flex h-8 w-8 items-center justify-center rounded-md transition-colors
          ${value ? 'bg-ocean-2 text-white' : 'bg-gray-200 text-gray-500'}
        `}>
                    {value ? (
                        <EyeOff className="h-4 w-4" />
                    ) : (
                        <Eye className="h-4 w-4" />
                    )}
                </div>
                <div className="flex-1">
                    <div className="flex items-center">
                        <Checkbox
                            {...register}
                            checked={value}
                            onChange={(checked) => {
                                setValue('onlyMe', checked);
                            }}
                            disabled={isSubmitting}
                            className="hidden"
                        />
                        <span className="text-sm font-medium text-gray-700">
                            Private board
                        </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        {value
                            ? 'Only visible to you'
                            : 'Visible to team members'}
                    </p>
                </div>
            </div>
            {error && (
                <p className="mt-1 text-xs text-red-500">{error.message}</p>
            )}
        </div>
    );
};
