'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGetUsers, type User } from '@/services/UsersService';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Checkbox from '@/components/ui/Checkbox';
import ApolloIcon from '@/components/ui/ApolloIcon';
import classNames from '@/utils/classNames';
import debounce from 'lodash/debounce';

interface UsersListProps {
    onUserSelect?: (user: User, isSelected: boolean) => void;
    selectedUserIds?: string[];
}

const UsersList = ({ onUserSelect, selectedUserIds = [] }: UsersListProps) => {
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const limit = 25;

    // Debounce search term
    const debouncedSetSearch = useMemo(
        () =>
            debounce((value: string) => {
                setDebouncedSearchTerm(value);
            }, 500),
        []
    );

    // Update debounced search when searchTerm changes
    useEffect(() => {
        debouncedSetSearch(searchTerm);
        return () => {
            debouncedSetSearch.cancel();
        };
    }, [searchTerm, debouncedSetSearch]);

    // Reset pagination and users when search changes
    useEffect(() => {
        setAllUsers([]);
        setPage(1);
        setHasMore(true);
    }, [debouncedSearchTerm]);

    // Initial data fetch
    const { data: usersData, isLoading: isInitialLoading, error: queryError } = useQuery({
        queryKey: ['users', 'table-settings', debouncedSearchTerm],
        queryFn: () => apiGetUsers({ page: 1, limit, search: debouncedSearchTerm || undefined }),
        enabled: true,
    });

    // Update allUsers when initial data loads
    useEffect(() => {
        if (usersData?.data) {
            setAllUsers(usersData.data);
            setHasMore(usersData.data.length === limit);
            setPage(1);
        }
    }, [usersData?.data, limit]);

    // Load more users when scrolling to bottom
    const loadMoreUsers = async () => {
        if (!hasMore || isLoadingMore) return;

        setIsLoadingMore(true);
        try {
            const nextPage = page + 1;
            const response = await apiGetUsers({
                page: nextPage,
                limit,
                search: debouncedSearchTerm || undefined
            });

            if (response?.data && response.data.length > 0) {
                setAllUsers((prev) => [...prev, ...response.data]);
                setPage(nextPage);
                setHasMore(response.data.length === limit);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error('Error loading more users:', error);
            setHasMore(false);
        } finally {
            setIsLoadingMore(false);
        }
    };

    // Handle scroll event - load more when near bottom
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        const { scrollTop, scrollHeight, clientHeight } = target;

        // Load more when 100px from bottom
        if (scrollHeight - scrollTop - clientHeight < 100 && hasMore && !isLoadingMore) {
            loadMoreUsers();
        }
    };

    return (
        <Card className="flex h-full flex-col overflow-hidden">
            <div className="border-b border-gray-200 px-2 py-0.5 flex items-center justify-center space-x-2">
                <div className="flex items-center justify-between space-x-2 flex-1">
                    <Input
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        prefix={<ApolloIcon name="search" className="text-gray-400" />}
                        className="w-full"
                    />
                </div>
                {allUsers.length > 0 && (
                    <div className="text-xs  bg-blue-300/20 rounded-md px-2 py-1 text-blue-700">
                        {allUsers.length} {allUsers.length === 1 ? 'user' : 'users'}
                    </div>
                )}
            </div>
            <div
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-2 py-2"
                style={{ maxHeight: 'calc(100vh - 200px)' }}
            >
                {queryError ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="text-sm text-red-600">Error loading users. Please try again.</div>
                    </div>
                ) : isInitialLoading && allUsers.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                        <ApolloIcon name="loading" className="animate-spin text-gray-400" />
                        <span className="ml-2 text-sm text-gray-500">Loading users...</span>
                    </div>
                ) : allUsers.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="text-sm text-gray-500">No users found</div>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {allUsers.map((user, i) => {
                            const isSelected = selectedUserIds.includes(user._id);
                            const userName = user?.info?.name || user?.name || user?.login || 'Unknown';
                            const userRole = (user as any)?.role || 'N/A';

                            return (
                                <div
                                    key={i + user._id}
                                    onClick={(e) => {
                                        // Prevent toggle when clicking checkbox
                                        if ((e.target as HTMLElement).closest('.checkbox-container')) {
                                            return;
                                        }
                                        onUserSelect?.(user, !isSelected);
                                    }}
                                    className={classNames(
                                        'cursor-pointer rounded-md px-3 py-2 text-sm transition-colors',
                                        isSelected
                                            ? 'bg-blue-50 text-blue-900'
                                            : 'hover:bg-gray-50 text-gray-700'
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <div
                                                className="checkbox-container"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Checkbox
                                                    checked={isSelected}
                                                    onChange={(checked) => onUserSelect?.(user, checked)}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">{userName}</div>
                                                <div className="text-xs text-gray-500 truncate">{user.login}</div>
                                            </div>
                                        </div>
                                        <span
                                            className={classNames(
                                                'ml-2 rounded px-2 py-0.5 text-xs font-medium',
                                                userRole === 'ADMIN'
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : 'bg-gray-100 text-gray-700'
                                            )}
                                        >
                                            {userRole}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        {isLoadingMore && (
                            <div className="flex items-center justify-center py-4">
                                <ApolloIcon name="loading" className="animate-spin text-gray-400" />
                                <span className="ml-2 text-xs text-gray-500">Loading more...</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
};

export default UsersList;

