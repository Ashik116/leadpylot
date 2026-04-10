import React from 'react';
import Skeleton from '@/components/ui/Skeleton';

export const CardDetailsModalSkeleton: React.FC = () => {
    return (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-1 backdrop-blur-md duration-300">
            <div className="animate-in zoom-in-95 flex h-[94vh] w-full max-w-[90dvw] 2xl:max-w-[70dvw] flex-col overflow-hidden rounded-md border border-ocean-2/50 bg-white shadow-2xl duration-200">
                {/* Header Ribbon Skeleton */}
                <div className="flex items-center justify-between border-b border-ocean-2/50 bg-gray-100 px-4 py-3">
                    <div className="flex items-center gap-3">
                        <Skeleton width="180px" height="36px" className="rounded-xl" />
                    </div>
                    <Skeleton variant="circle" width="32px" height="32px" className="rounded-xl" />
                </div>
                <div className="flex flex-1 overflow-hidden">
                    {/* LEFT SIDE Skeleton */}
                    <div className="flex w-2/3 flex-col overflow-y-auto border-r border-ocean-2/50 p-6">
                        <div className="space-y-6">
                            {/* Title Skeleton */}
                            <div className="space-y-2">
                                <Skeleton width="200px" height="24px" className="rounded" />
                                <Skeleton width="100%" height="32px" className="rounded-lg" />
                            </div>

                            {/* Description Skeleton */}
                            <div className="space-y-2">
                                <Skeleton width="100px" height="16px" className="rounded" />
                                <div className="space-y-2">
                                    <Skeleton width="100%" height="60px" className="rounded-lg" />
                                    <Skeleton width="90%" height="20px" className="rounded" />
                                    <Skeleton width="85%" height="20px" className="rounded" />
                                </div>
                            </div>

                            {/* Meta Fields Row Skeleton */}
                            <div className="grid grid-cols-3 gap-4">
                                {Array.from({ length: 3 }).map((_, idx) => (
                                    <div key={idx} className="space-y-2">
                                        <Skeleton width="60px" height="12px" className="rounded" />
                                        <Skeleton width="100%" height="20px" className="rounded" />
                                    </div>
                                ))}
                            </div>

                            {/* Labels Section Skeleton */}
                            <div className="space-y-2">
                                <Skeleton width="80px" height="16px" className="rounded" />
                                <div className="flex gap-2">
                                    {Array.from({ length: 3 }).map((_, idx) => (
                                        <Skeleton key={idx} width="60px" height="24px" className="rounded-full" />
                                    ))}
                                </div>
                            </div>

                            {/* Members Section Skeleton */}
                            <div className="space-y-2">
                                <Skeleton width="100px" height="16px" className="rounded" />
                                <div className="flex gap-2">
                                    {Array.from({ length: 3 }).map((_, idx) => (
                                        <Skeleton
                                            key={idx}
                                            variant="circle"
                                            width="28px"
                                            height="28px"
                                        />
                                    ))}
                                    <Skeleton
                                        variant="circle"
                                        width="28px"
                                        height="28px"
                                        className="border border-dashed"
                                    />
                                </div>
                            </div>

                            {/* Date Section Skeleton */}
                            <div className="space-y-2">
                                <Skeleton width="80px" height="16px" className="rounded" />
                                <Skeleton width="150px" height="32px" className="rounded-lg" />
                            </div>

                            {/* Checklist Section Skeleton */}
                            <div className="space-y-3">
                                <Skeleton width="120px" height="16px" className="rounded" />
                                {Array.from({ length: 2 }).map((_, idx) => (
                                    <div key={idx} className="space-y-2 rounded-lg border border-gray-200 p-3">
                                        <Skeleton width="60%" height="18px" className="rounded" />
                                        <div className="space-y-2 pl-4">
                                            {Array.from({ length: 2 }).map((_, itemIdx) => (
                                                <div key={itemIdx} className="flex items-center gap-2">
                                                    <Skeleton variant="circle" width="16px" height="16px" />
                                                    <Skeleton width="70%" height="16px" className="rounded" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Custom Fields Section Skeleton */}
                            <div className="space-y-3">
                                <Skeleton width="140px" height="16px" className="rounded" />
                                {Array.from({ length: 2 }).map((_, idx) => (
                                    <div key={idx} className="flex items-center justify-between border-b border-gray-200 pb-2">
                                        <Skeleton width="120px" height="16px" className="rounded" />
                                        <Skeleton width="100px" height="16px" className="rounded" />
                                    </div>
                                ))}
                            </div>

                            {/* Attachments Section Skeleton */}
                            <div className="space-y-3">
                                <Skeleton width="120px" height="16px" className="rounded" />
                                <div className="space-y-2">
                                    {Array.from({ length: 2 }).map((_, idx) => (
                                        <div key={idx} className="flex items-center gap-3 rounded-lg border border-gray-200 p-2">
                                            <Skeleton width="32px" height="32px" className="rounded" />
                                            <div className="flex-1 space-y-1">
                                                <Skeleton width="60%" height="14px" className="rounded" />
                                                <Skeleton width="40%" height="12px" className="rounded" />
                                            </div>
                                            <Skeleton variant="circle" width="20px" height="20px" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SIDE Skeleton (Comments & Activity) */}
                    <div className="flex w-1/3 flex-col overflow-y-auto p-6">
                        <div className="space-y-6">
                            {/* Tabs Skeleton */}
                            <div className="flex gap-2 border-b border-gray-200">
                                <Skeleton width="80px" height="32px" className="rounded-t" />
                                <Skeleton width="80px" height="32px" className="rounded-t" />
                            </div>

                            {/* Comments Section Skeleton */}
                            <div className="space-y-4">
                                {/* Comment Input Skeleton */}
                                <div className="space-y-2">
                                    <Skeleton width="100%" height="80px" className="rounded-lg" />
                                    <div className="flex justify-end">
                                        <Skeleton width="100px" height="32px" className="rounded" />
                                    </div>
                                </div>

                                {/* Comment List Skeleton */}
                                {Array.from({ length: 3 }).map((_, idx) => (
                                    <div key={idx} className="space-y-2 rounded-lg border border-gray-200 p-3">
                                        <div className="flex items-center gap-2">
                                            <Skeleton variant="circle" width="32px" height="32px" />
                                            <div className="flex-1 space-y-1">
                                                <Skeleton width="100px" height="14px" className="rounded" />
                                                <Skeleton width="60px" height="12px" className="rounded" />
                                            </div>
                                        </div>
                                        <div className="space-y-1 pl-10">
                                            <Skeleton width="100%" height="14px" className="rounded" />
                                            <Skeleton width="80%" height="14px" className="rounded" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CardDetailsModalSkeleton;
