import React, { useMemo } from 'react';
import Skeleton from '@/components/ui/Skeleton';

interface KanbanCardSkeletonProps {
    showLabels?: boolean;
    showAvatars?: boolean;
    height?: 'short' | 'medium' | 'tall';
    animationDelay?: number;
    seed?: number; // Used for deterministic variations
}

export const KanbanCardSkeleton: React.FC<KanbanCardSkeletonProps> = ({
    showLabels = false,
    showAvatars = false,
    height = 'medium',
    animationDelay = 0,
    seed = 0,
}) => {
    const heightMap = {
        short: 'min-h-[60px]',
        medium: 'min-h-[80px]',
        tall: 'min-h-[100px]',
    };

    // Use seed for deterministic variations
    const variations = useMemo(() => {
        const titleWidths = ['75%', '85%', '90%', '95%'];
        const labelCount = (seed % 3) + 1; // 1-3 labels
        const avatarCount = (seed % 2) + 1; // 1-2 avatars
        const showFooterIcon = (seed % 2) === 0; // 50% chance based on seed
        const titleWidth = titleWidths[seed % titleWidths.length];

        return {
            titleWidth,
            labelCount,
            avatarCount,
            showFooterIcon,
        };
    }, [seed]);

    return (
        <div
            className={`group relative w-full rounded-lg bg-gray-100 p-3 shadow-md border transition-all hover:border-black ${heightMap[height]}`}
            style={{
                animationDelay: `${animationDelay}ms`,
            }}
        >
            {/* Labels skeleton */}
            {showLabels && (
                <div className="mb-2 flex items-start justify-between">
                    <div className="flex flex-wrap gap-1">
                        {Array.from({ length: variations.labelCount }).map((_, idx) => (
                            <Skeleton
                                key={idx}
                                width="32px"
                                height="6px"
                                className="rounded-full"
                                style={{ animationDelay: `${animationDelay + idx * 50}ms` }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Title skeleton */}
            <div className="mb-3 flex items-start gap-2">
                <Skeleton
                    width={variations.titleWidth}
                    height="16px"
                    className="rounded"
                    style={{ animationDelay: `${animationDelay + 100}ms` }}
                />
            </div>

            {/* Footer skeleton */}
            <div className="border-ocean-2/50 flex items-center justify-between border-t pt-2">
                <div className="flex items-center gap-2">
                    {/* Optional date/attachment/checklist icons */}
                    {variations.showFooterIcon && (
                        <Skeleton
                            width="60px"
                            height="20px"
                            className="rounded"
                            style={{ animationDelay: `${animationDelay + 150}ms` }}
                        />
                    )}
                </div>

                {/* Avatars skeleton */}
                {showAvatars && (
                    <div className="flex items-center gap-1">
                        {Array.from({ length: variations.avatarCount }).map((_, idx) => (
                            <Skeleton
                                key={idx}
                                variant="circle"
                                width="20px"
                                height="20px"
                                style={{ animationDelay: `${animationDelay + 200 + idx * 50}ms` }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default KanbanCardSkeleton;
