'use client';

import Tabs from '@/components/ui/Tabs';
import QuickActions from './_components/QuickActions';
import Feedbacks from './_components/Feedbacks';
import VectorDatabase from './_components/VectorDatabase';
import Reports from './_components/Reports';

const { TabList, TabNav, TabContent } = Tabs;

export default function ManageLeadbotPage() {
  return (
    <div className="space-y-3 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Manage Leadbot</h1>
          <p className="text-xs text-gray-500">
            Configure and manage your Leadbot settings, feedbacks, and database
          </p>
        </div>
      </div>

      <Tabs defaultValue="quickActions">
        <TabList className="border-b border-gray-200">
          <TabNav value="quickActions">Quick Actions</TabNav>
          <TabNav value="feedbacks">Feedbacks</TabNav>
          <TabNav value="vectorDatabase">Vector Database</TabNav>
          <TabNav value="reports">Reports</TabNav>
        </TabList>
        <div className="mt-3">
          <TabContent value="quickActions">
            <QuickActions />
          </TabContent>
          <TabContent value="feedbacks">
            <Feedbacks />
          </TabContent>
          <TabContent value="vectorDatabase">
            <VectorDatabase />
          </TabContent>
          <TabContent value="reports">
            <Reports />
          </TabContent>
        </div>
      </Tabs>
    </div>
  );
}
