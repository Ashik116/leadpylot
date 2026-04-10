'use client';

import { useEffect } from 'react';
import { UserDetails } from './_components/UserDetails';
import Loading from '@/components/shared/Loading';
import { useUser, useUsers } from '@/services/hooks/useUsers';
import { useUsersNavigationStore } from '@/stores/navigationStores';

function UserPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: userData, isLoading: isUserLoading } = useUser(id);
  const { data: usersData, isLoading: isUsersLoading } = useUsers({ limit: 100 }); // Fetch more users to ensure we have enough for navigation

  // Get navigation store methods
  const setCurrentIndex = useUsersNavigationStore((state) => state.setCurrentIndex);
  const findUserIndexById = useUsersNavigationStore((state) => state.findIndexById);

  // Store users in the navigation store when they're loaded
  useEffect(() => {
    if (usersData?.data) {
      // Add these users to the store
      const addItems = useUsersNavigationStore.getState().addItems;
      addItems(usersData?.data);

      // Set total users count if available
      if (usersData?.meta?.total) {
        const setTotalItems = useUsersNavigationStore.getState().setTotalItems;
        setTotalItems(usersData?.meta?.total);
      }
    }
  }, [usersData?.data, usersData?.meta?.total]);

  // Set the current user index when the user data is loaded
  useEffect(() => {
    if (userData && usersData?.data) {
      // Find the index of the current user in the collection
      const userIndex = findUserIndexById(userData?._id);
      if (userIndex !== -1) {
        setCurrentIndex(userIndex);
      }
    }
  }, [userData, usersData?.data, findUserIndexById, setCurrentIndex]);

  if (isUserLoading || isUsersLoading) {
    return <Loading className="absolute inset-0" loading={true} />;
  }

  if (!userData) {
    return <div>User not found</div>;
  }

  return <UserDetails user={userData} />;
}

export default UserPage;
