'use client';

import { useState, useEffect } from 'react';
import Tabs from '@/components/ui/Tabs';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useRouter, usePathname } from 'next/navigation';
import OfficesDashboard from './_components/OfficesDashboard';
import UsersDashboardRefactored from '../users/_components/UsersDashboardRefactored';
import { RolesDashboard } from '../users/_components/roles';

const { TabList, TabNav, TabContent } = Tabs;

export default function OfficesPage() {
  const pathname = usePathname();
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === Role.ADMIN;

  const getInitialTab = () => {
    if (pathname === '/admin/offices') return 'offices';
    if (pathname === '/admin/roles') return 'roles';
    return 'users';
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    if (pathname === '/admin/offices') setActiveTab('offices');
    else if (pathname === '/admin/roles') setActiveTab('roles');
    else if (pathname === '/admin/users') setActiveTab('users');
  }, [pathname]);

  const onTabChange = (val: string) => {
    setActiveTab(val);
    if (val === 'offices') router.push('/admin/offices');
    else if (val === 'roles') router.push('/admin/roles');
    else router.push('/admin/users');
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
        {isAdmin && (
          <TabContent value="offices">
            <OfficesDashboard />
          </TabContent>
        )}
      </Tabs>
    </div>
  );
}
