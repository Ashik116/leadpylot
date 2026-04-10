'use client';

import Card from '@/components/ui/Card';
import React from 'react';

const SecurityDashboardSkeleton: React.FC = () => {
    return (
        <div className="space-y-6 max-h-[80vh] overflow-hidden rounded-lg">
            {/* Controls Skeleton */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-5 w-20 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-10 w-40 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="h-9 w-20 bg-gray-200 rounded animate-pulse"></div>
            </div>

            {/* Statistics Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2"></div>
                                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-1"></div>
                                <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Recent Activity Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Failed Login Skeleton */}
                <Card
                    header={{
                        content: (
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                        )
                    }}
                    bodyClass="p-6"
                >
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                                    <div>
                                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1"></div>
                                        <div className="h-3 w-32 bg-gray-200 rounded animate-pulse"></div>
                                    </div>
                                </div>
                                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Failed Countries Skeleton */}
                <Card
                    header={{
                        content: (
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                                <div className="h-5 w-40 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                        )
                    }}
                    bodyClass="p-6"
                >
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-4 bg-gray-200 rounded animate-pulse"></div>
                                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                                </div>
                                <div className="h-4 w-8 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Successful Login Skeleton */}
                <Card
                    header={{
                        content: (
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                                <div className="h-5 w-36 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                        )
                    }}
                    bodyClass="p-6"
                >
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                                    <div>
                                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1"></div>
                                        <div className="h-3 w-32 bg-gray-200 rounded animate-pulse"></div>
                                    </div>
                                </div>
                                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Active Sessions Skeleton */}
                <Card
                    header={{
                        content: (
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                                <div className="h-5 w-28 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                        )
                    }}
                    bodyClass="p-6"
                >
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                                    <div>
                                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1"></div>
                                        <div className="h-3 w-32 bg-gray-200 rounded animate-pulse"></div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="h-7 w-16 bg-gray-200 rounded animate-pulse"></div>
                                    <div className="h-7 w-16 bg-gray-200 rounded animate-pulse"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default SecurityDashboardSkeleton;
