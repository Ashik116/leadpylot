import React, { useMemo } from 'react';
import Skeleton from '@/components/ui/Skeleton';
import { KanbanCardSkeleton } from './KanbanCardSkeleton';

interface KanbanColumnSkeletonProps {
    cardCount?: number;
    animationDelay?: number;
    seed?: number; // Used for deterministic variations
}

export const KanbanColumnSkeleton: React.FC<KanbanColumnSkeletonProps> = ({
    cardCount,
    animationDelay = 0,
    seed = 0,
}) => {
    // Use seed for deterministic card count (3-6 cards)
    const numCards = cardCount || ((seed % 4) + 3);

    // Generate deterministic card configurations based on seed
    const cardConfigs = useMemo(() => {
        return Array.from({ length: numCards }).map((_, idx) => {
            const cardSeed = seed * 10 + idx; // Unique seed for each card
            return {
                showLabels: (cardSeed % 10) < 3, // 30% chance
                showAvatars: (cardSeed % 10) < 4, // 40% chance
                height: ['short', 'medium', 'tall'][cardSeed % 3] as 'short' | 'medium' | 'tall',
                seed: cardSeed,
            };
        });
    }, [numCards, seed]);

    return (
        <div
            className="border-ocean-2/50 flex max-h-full w-[272px] shrink-0 flex-col rounded-xl border bg-white"
            style={{
                animationDelay: `${animationDelay}ms`,
            }}
        >
            {/* Column header */}
            <div className="flex items-center justify-between px-3 py-2">
                <Skeleton
                    width="120px"
                    height="20px"
                    className="rounded"
                    style={{ animationDelay: `${animationDelay + 50}ms` }}
                />
                <Skeleton
                    variant="circle"
                    width="24px"
                    height="24px"
                    className="rounded-lg"
                    style={{ animationDelay: `${animationDelay + 100}ms` }}
                />
            </div>

            {/* Divider */}
            <div className="border-t mx-3 border-ocean-2/50" />

            {/* Cards container */}
            <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto px-2 pb-2">
                {cardConfigs.map((config, idx) => (
                    <KanbanCardSkeleton
                        key={idx}
                        showLabels={config.showLabels}
                        showAvatars={config.showAvatars}
                        height={config.height}
                        animationDelay={animationDelay + idx * 100}
                        seed={config.seed}
                    />
                ))}

                {/* Add card button skeleton */}
                <div className="pt-1">
                    <Skeleton
                        width="100%"
                        height="36px"
                        className="rounded-lg"
                        style={{ animationDelay: `${animationDelay + numCards * 100 + 50}ms` }}
                    />
                </div>
            </div>
        </div>
    );
};

export default KanbanColumnSkeleton;
