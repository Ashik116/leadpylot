import React from 'react';
import { KanbanColumnSkeleton } from './KanbanColumnSkeleton';

interface KanbanBoardSkeletonProps {
    columnCount?: number;
    className?: string;
}

export const KanbanBoardSkeleton: React.FC<KanbanBoardSkeletonProps> = ({
    columnCount = 4,
    className = '',
}) => {
    return (
        <div className={`custom-scrollbar h-full flex-1 overflow-x-auto p-6 ${className}`}>
            <div className="flex h-full items-start gap-6">
                {Array.from({ length: columnCount }).map((_, idx) => (
                    <KanbanColumnSkeleton
                        key={idx}
                        animationDelay={idx * 150}
                        seed={idx}
                    />
                ))}
            </div>
        </div>
    );
};

export default KanbanBoardSkeleton;
