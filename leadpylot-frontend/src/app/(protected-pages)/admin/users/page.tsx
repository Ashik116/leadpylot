'use client';

import { useState, useEffect } from 'react';
import Tabs from '@/components/ui/Tabs';
import UsersDashboardRefactored from './_components/UsersDashboardRefactored';
import { RolesDashboard } from './_components/roles';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useRouter, usePathname } from 'next/navigation';

const { TabList, TabNav, TabContent } = Tabs;

export default function UsersDashboardPage() {
  const pathname = usePathname();
  const { user } = useAuth();
  const router = useRouter();
  // Only show Roles tab to Admin users
  const isAdmin = user?.role === Role.ADMIN;

  // Sync activeTab with current route
  const [activeTab, setActiveTab] = useState(() => {
    return pathname === '/admin/roles' ? 'roles' : 'users';
  });

  // Update activeTab when pathname changes
  useEffect(() => {
    if (pathname === '/admin/roles') {
      setActiveTab('roles');
    } else if (pathname === '/admin/users') {
      setActiveTab('users');
    } else if (pathname === '/admin/offices') {
      setActiveTab('offices');
    }
  }, [pathname]);

  const onTabChange = (val: string) => {
    setActiveTab(val);
    if (val === 'roles') {
      router.push('/admin/roles');
    } else if (val === 'users') {
      router.push('/admin/users');
    }
    if (val === 'offices') {
      router.push('/admin/offices');
    }
  };

  return (
    <div className="space-y-2 px-4">
      <Tabs value={activeTab} onChange={onTabChange}>
        <TabList>
          <TabNav value="users">Users</TabNav>
          {isAdmin && <TabNav value="roles">Roles &amp; Permissions</TabNav>}
          {isAdmin && <TabNav value="offices">Offices</TabNav>}
        </TabList>
        <TabContent value="users">
          <div>
            <UsersDashboardRefactored />
          </div>
        </TabContent>
        {isAdmin && (
          <TabContent value="roles">
            <div>
              <RolesDashboard />
            </div>
          </TabContent>
        )}
      </Tabs>
    </div>
  );
}
