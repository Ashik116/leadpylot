'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import Skeleton from '@/components/ui/Skeleton';
import { 
  HiOutlineChartBar, 
  HiOutlineCheckCircle, 
  HiOutlineXCircle, 
  HiOutlineClock,
  HiOutlineTrendingUp,
} from 'react-icons/hi';
import { useNotificationAnalytics } from '@/services/hooks/useNotificationRules';

// Date range options
const DATE_RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

// Stat card component
const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  iconBg, 
  iconColor, 
  valueColor = 'text-gray-900',
  subtitle 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType; 
  iconBg: string; 
  iconColor: string;
  valueColor?: string;
  subtitle?: string;
}) => (
  <Card className="p-5 border border-gray-200">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className={`text-3xl font-semibold mt-1 ${valueColor}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
    </div>
  </Card>
);

// Progress bar component
const ProgressBar = ({ 
  label, 
  value, 
  total, 
  color 
}: { 
  label: string; 
  value: number; 
  total: number; 
  color: string;
}) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{percentage.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export const NotificationAnalytics = () => {
  const [dateRange, setDateRange] = useState('30d');

  // Calculate date params
  const getDateParams = () => {
    if (dateRange === 'all') return {};
    const days = parseInt(dateRange);
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    return { startDate, endDate };
  };

  const { data, isLoading } = useNotificationAnalytics(getDateParams());

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-5 border border-gray-200">
              <Skeleton height={80} />
            </Card>
          ))}
        </div>
        <Card className="p-6 border border-gray-200">
          <Skeleton height={200} />
        </Card>
      </div>
    );
  }

  const totals = data?.totals || { delivered: 0, failed: 0, skipped: 0, pending: 0 };
  const totalAll = totals.delivered + totals.failed + totals.skipped + totals.pending;
  const deliveryRate = totalAll > 0 ? ((totals.delivered / totalAll) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Delivery Analytics</h3>
          <p className="text-sm text-gray-500">Monitor notification delivery performance</p>
        </div>
        <div className="w-48">
          <Select<{ value: string; label: string }>
            value={DATE_RANGE_OPTIONS.find((opt) => opt.value === dateRange)}
            onChange={(option) => option && setDateRange(option.value)}
            options={DATE_RANGE_OPTIONS}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Total Sent"
          value={totalAll}
          icon={HiOutlineChartBar}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Delivered"
          value={totals.delivered}
          icon={HiOutlineCheckCircle}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          valueColor="text-green-600"
        />
        <StatCard
          title="Failed"
          value={totals.failed}
          icon={HiOutlineXCircle}
          iconBg="bg-red-100"
          iconColor="text-red-600"
          valueColor={totals.failed > 0 ? 'text-red-600' : 'text-gray-900'}
        />
        <StatCard
          title="Delivery Rate"
          value={`${deliveryRate}%`}
          icon={HiOutlineTrendingUp}
          iconBg="bg-indigo-100"
          iconColor="text-indigo-600"
          valueColor="text-indigo-600"
        />
      </div>

      {/* Delivery Rate Breakdown */}
      {totalAll > 0 && (
        <Card className="p-6 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-6">Delivery Breakdown</h4>
          <div className="space-y-4">
            <ProgressBar 
              label="Delivered" 
              value={totals.delivered} 
              total={totalAll} 
              color="bg-green-500" 
            />
            <ProgressBar 
              label="Failed" 
              value={totals.failed} 
              total={totalAll} 
              color="bg-red-500" 
            />
            <ProgressBar 
              label="Pending" 
              value={totals.pending} 
              total={totalAll} 
              color="bg-yellow-500" 
            />
            <ProgressBar 
              label="Skipped" 
              value={totals.skipped} 
              total={totalAll} 
              color="bg-gray-400" 
            />
          </div>
        </Card>
      )}

      {/* By Event Type */}
      <Card className="p-6 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-6">By Event Type</h4>
        {data?.byEventType && data.byEventType.length > 0 ? (
          <div className="space-y-3">
            {data.byEventType.slice(0, 10).map((item) => {
              const delivered = item.statuses.find((s) => s.status === 'delivered')?.count || 0;
              const failed = item.statuses.find((s) => s.status === 'failed')?.count || 0;
              const rate = item.total > 0 ? ((delivered / item.total) * 100).toFixed(0) : '0';

              return (
                <div 
                  key={item._id} 
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item._id}</p>
                    <p className="text-sm text-gray-500">{item.total.toLocaleString()} notifications</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600">{delivered} delivered</p>
                      {failed > 0 && (
                        <p className="text-sm font-medium text-red-600">{failed} failed</p>
                      )}
                    </div>
                    <div className={`w-16 text-center py-1 rounded-full text-sm font-semibold ${
                      parseInt(rate) >= 90 
                        ? 'bg-green-100 text-green-700' 
                        : parseInt(rate) >= 70 
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                    }`}>
                      {rate}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <HiOutlineChartBar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No analytics data yet</h3>
            <p className="text-sm text-gray-500 text-center max-w-md">
              Analytics will appear here once notifications are sent using the dynamic rules system.
              Enable rules and trigger some events to see data.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};
