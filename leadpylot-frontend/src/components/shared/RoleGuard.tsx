import { Role } from '@/configs/navigation.config/auth.route.config';
import { useSession } from '@/hooks/useSession';
import React from 'react';

const RoleGuard = ({
  role = Role?.ADMIN,
  children,
}: {
  role?: Role;
  children: React.ReactNode;
}) => {
  const { data: session } = useSession();

  // After session is loaded, check the role
  if (session?.user && session?.user?.role?.toUpperCase() !== role?.toUpperCase()) {
    return null;
  }
  if (session?.user && session?.user?.role?.toUpperCase() === role?.toUpperCase()) {
    return children;
  }

  return null;
};

export default RoleGuard;
