import Skeleton from '@/components/ui/Skeleton';

const BankPageSkeleton = () => {
    return (
        <div className="p-6">
            {/* Header section skeleton */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {/* Bank name skeleton */}
                    <Skeleton
                        height={28}
                        width={200}
                        className="rounded"
                    />
                    {/* Position counter skeleton */}
                    <Skeleton
                        height={20}
                        width={60}
                        className="rounded"
                    />
                </div>
                {/* Navigation skeleton */}
                <div className="flex items-center gap-2">
                    <Skeleton
                        height={32}
                        width={32}
                        variant="circle"
                    />
                    <Skeleton
                        height={32}
                        width={32}
                        variant="circle"
                    />
                    <Skeleton
                        height={32}
                        width={32}
                        variant="circle"
                    />
                </div>
            </div>

            {/* Form section skeleton */}
            <div className="space-y-6">
                {/* Form fields skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* First row */}
                    <div className="space-y-4">
                        <div>
                            <Skeleton height={16} width={80} className="mb-2 rounded" />
                            <Skeleton height={40} width="100%" className="rounded" />
                        </div>
                        <div>
                            <Skeleton height={16} width={100} className="mb-2 rounded" />
                            <Skeleton height={40} width="100%" className="rounded" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <Skeleton height={16} width={90} className="mb-2 rounded" />
                            <Skeleton height={40} width="100%" className="rounded" />
                        </div>
                        <div>
                            <Skeleton height={16} width={70} className="mb-2 rounded" />
                            <Skeleton height={40} width="100%" className="rounded" />
                        </div>
                    </div>
                </div>

                {/* Second row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <Skeleton height={16} width={85} className="mb-2 rounded" />
                            <Skeleton height={40} width="100%" className="rounded" />
                        </div>
                        <div>
                            <Skeleton height={16} width={75} className="mb-2 rounded" />
                            <Skeleton height={40} width="100%" className="rounded" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <Skeleton height={16} width={95} className="mb-2 rounded" />
                            <Skeleton height={40} width="100%" className="rounded" />
                        </div>
                        <div>
                            <Skeleton height={16} width={65} className="mb-2 rounded" />
                            <Skeleton height={40} width="100%" className="rounded" />
                        </div>
                    </div>
                </div>

                {/* Textarea skeleton */}
                <div>
                    <Skeleton height={16} width={120} className="mb-2 rounded" />
                    <Skeleton height={100} width="100%" className="rounded" />
                </div>

                {/* Action buttons skeleton */}
                <div className="flex justify-end gap-3 pt-4">
                    <Skeleton height={40} width={100} className="rounded" />
                    <Skeleton height={40} width={100} className="rounded" />
                </div>
            </div>
        </div>
    );
};

export default BankPageSkeleton;
