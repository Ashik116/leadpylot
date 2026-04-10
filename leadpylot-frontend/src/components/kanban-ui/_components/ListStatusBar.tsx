'use client';

import { useBoard } from '@/hooks/useBoards';
import { useTodoBoardRealtime } from '@/services/hooks/useTodoBoardRealtime';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

interface Props {
    boardId?: string | null;
}

export const ListStatusBar = ({ boardId }: Props) => {
    const qc = useQueryClient();
    const barRef = useRef<HTMLDivElement>(null);
    const [barWidth, setBarWidth] = useState(200);

    const { data, isLoading } = useBoard(boardId ?? null, !!boardId);

    const invalidate = () => boardId && qc.invalidateQueries({ queryKey: ['boards', 'detail', boardId] });

    useTodoBoardRealtime({
        boardId: boardId ?? undefined,
        enabled: !!boardId,
        autoInvalidateCache: false,
        onTaskCreated: invalidate,
        onTaskMoved: invalidate,
        onTaskUpdated: invalidate,
        onTaskDeleted: invalidate,
    });

    useEffect(() => {
        const resize = () => barRef.current && setBarWidth(barRef.current.offsetWidth);
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);

    const segments = useMemo(() => {
        const lists = data?.data?.lists
            ?.slice()
            .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
            .filter((l: any) => (l.taskCount || 0) > 0); // Filter out lists with zero task count

        if (!lists?.length) return [];

        const total = lists.reduce((s: any, l: any) => s + (l.taskCount || 0), 0);
        const min = Math.max(0.02, 4 / barWidth);

        let left: number = 0;
        const segs = lists.map((list: any) => {
            const w = Math.max(total ? (list.taskCount || 0) / total : 1 / lists.length, min);
            const seg = { list, width: w, left: left };
            /* eslint-disable-next-line */
            left += w;
            return seg;
        });

        const scale = segs.reduce((s: any, x: any) => s + x.width, 0);
        if (scale > 1) {
            let l = 0;
            segs.forEach((s: any) => ((s.width /= scale), (s.left = l), (l += s.width)));
        }

        return segs;
    }, [data, barWidth]);

    if (!boardId || isLoading || !segments.length) return null;

    return (
        <div ref={barRef} className="relative max-w-md">
            <div className="flex h-6 overflow-visible items-center">
                {segments.map((s: any, i: number) => (
                    <div
                        key={s.list._id}
                        className="group relative h-full cursor-pointer transition-all duration-200 ease-in-out origin-center hover:scale-y-[1.25] hover:z-10 z-0"
                        style={{
                            width: `${s.width * 100}%`,
                            background: s.list.color || '#9CA3AF',
                            borderRadius:
                                i === 0
                                    ? '0.2rem 0 0 0.2rem'
                                    : i === segments.length - 1
                                        ? '0 0.2rem 0.2rem 0'
                                        : 0,
                        }}>
                        {/* Tooltip */}
                        <div className="absolute left-1/2 top-full mt-2 -translate-x-1/2 rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 pointer-events-none transition-all duration-200 group-hover:opacity-100 group-hover:scale-y-[0.8] whitespace-nowrap">
                            {s.list.listTitle} / {s.list.taskCount || 0}
                            {/* Arrow */}
                            <div className="absolute left-1/2 bottom-full -translate-x-1/2 h-0 w-0 border-l-[6px] border-r-[6px] border-b-[6px] border-transparent border-b-gray-800" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
