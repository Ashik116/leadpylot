'use client';

const BankCardSkeleton = () => {
    return (
        <div className="flex w-full border-b border-r border-gray-200 animate-pulse min-w-0">
            {/* Left Section */}
            <div className="flex-1 text-left px-2 sm:px-4 py-2 min-w-0">
                <div className="mb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                        <div className="h-4 bg-gray-200 rounded w-16 sm:w-20"></div>
                        {/* <div className="h-5 bg-gray-200 rounded-full w-12"></div> */}
                    </div>
                </div>
                {/* <div className="flex items-center gap-1">
                    <div className="h-3 bg-gray-200 rounded w-8"></div>
                    <div className="h-3 bg-gray-200 rounded w-12"></div>
                </div> */}
            </div>

            {/* Right Section */}
            <div className="flex-1 text-right  px-2 sm:px-4 py-2 min-w-0">
                <div className="mb-2 flex items-end justify-end">
                    <div className="hidden sm:block justify-end">
                        <div className="h-3 bg-gray-200 rounded w-24 mx-auto"></div>
                    </div>
                    <div className="sm:hidden space-y-1 justify-end flex items-end">
                        <div className="h-3 bg-gray-200 rounded w-16 mx-auto"></div>
                        <div className="h-3 bg-gray-200 rounded w-16 mx-auto"></div>
                    </div>
                </div>
                {/* <div className="flex items-end justify-end gap-1">
                    <div className="h-3 bg-gray-200 rounded w-8"></div>
                    <div className="h-3 bg-gray-200 rounded w-12 sm:w-16"></div>
                </div> */}
            </div>
        </div>
    );
};

const BankSkeletonGrid = ({ count = 12 }: { count?: number }) => {
    return (
        <div className="bg-white rounded-lg border border-gray-200 max-h-[80dvh] overflow-hidden">
            {/* Header Row */}
            <div className="sticky top-0 z-10 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 border-b border-gray-200 bg-gray-50 font-semibold text-gray-700 shadow-sm">
                <div className="flex justify-between">
                    <div className="text-left px-4 ">info</div>
                    <div className="text-center px-4 border-r border-gray-300">allow</div>
                </div>
                <div className="flex justify-between">
                    <div className="text-left px-4">info</div>
                    <div className="text-center px-4 border-r border-gray-300">allow</div>
                </div>
                <div className="justify-between hidden md:flex">
                    <div className="text-left px-4 hidden md:block">info</div>
                    <div className="text-center px-4 border-r border-gray-300">allow</div>
                </div>
                <div className="justify-between hidden xl:flex">
                    <div className="text-left px-4">info</div>
                    <div className="text-center px-4">allow</div>
                </div>
            </div>

            {/* Skeleton Cards */}
            <div className="overflow-y-auto max-h-max">
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: count }, (_, i) => (
                        <BankCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BankSkeletonGrid;
