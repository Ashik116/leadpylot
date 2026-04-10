import React from 'react';
import Spinner from '@/components/ui/Spinner';
import type { CommonProps } from '@/@types/common';

interface UploadLoaderProps extends CommonProps {
    text?: string;
    spinnerSize?: string | number;
    spinnerColor?: string;
    textColor?: string;
    dotsColor?: string;
}

export const UploadLoader: React.FC<UploadLoaderProps> = ({
    text = 'Uploading',
    spinnerSize = 16,
    spinnerColor = 'text-ocean-2',
    textColor = 'text-ocean-2',
    dotsColor = 'bg-ocean-2',
    className = '',
    ...rest
}) => {
    return (
        <div className={`flex items-center gap-1.5 ${className}`} {...rest}>
            <Spinner size={spinnerSize} customColorClass={spinnerColor} />
            <div className="flex items-center gap-1.5">
                <span className={`text-xs font-medium ${textColor}`}>
                    {text}
                </span>
                <div className="flex gap-0.5 items-center">
                    <span
                        className={`inline-block w-1 h-1 ${dotsColor} rounded-full animate-bounce`}
                        style={{ animationDelay: '0ms', animationDuration: '1.4s' }}
                    />
                    <span
                        className={`inline-block w-1 h-1 ${dotsColor} rounded-full animate-bounce`}
                        style={{ animationDelay: '0.2s', animationDuration: '1.4s' }}
                    />
                    <span
                        className={`inline-block w-1 h-1 ${dotsColor} rounded-full animate-bounce`}
                        style={{ animationDelay: '0.4s', animationDuration: '1.4s' }}
                    />
                </div>
            </div>
        </div>
    );
};

export default UploadLoader;
