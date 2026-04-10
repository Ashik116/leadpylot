'use client';

interface LoadingStateProps {
    message?: string;
}

const LoadingState = ({ message = 'Loading email details...' }: LoadingStateProps) => {
    return (
        <div className="h-full w-full bg-white">
            {/* Header Skeleton */}
            <div className="border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
                        <div className="space-y-2">
                            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                </div>
            </div>

            {/* Content Skeleton */}
            <div className="p-4 space-y-6">
                {/* Email Body Skeleton */}
                <div className="space-y-4">
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                    <div className="space-y-2">
                        <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                </div>

                {/* Approval Section Skeleton */}
                <div className="border-t border-gray-200 pt-4 space-y-4">
                    <div className="flex items-center space-x-2">
                        <div className="h-5 w-5 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex space-x-4">
                        <div className="flex items-center space-x-2">
                            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                        </div>
                    </div>

                    {/* Attachment Buttons */}
                    <div className="flex space-x-2">
                        <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-8 w-28 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
                    </div>

                    {/* Notes Input */}
                    <div className="space-y-2">
                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-20 w-full bg-gray-200 rounded animate-pulse"></div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                        <div className="h-8 w-28 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-8 w-28 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                </div>

                {/* Lead Matching Skeleton */}
                <div className="border-t border-gray-200 pt-4 space-y-3">
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-16 w-full bg-gray-200 rounded animate-pulse"></div>
                </div>
            </div>

            {/* Loading Message */}
            {message && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <p className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">
                        {message}
                    </p>
                </div>
            )}
        </div>
    );
};

export default LoadingState; 