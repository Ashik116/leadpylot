'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTenants, useSuspendTenant, useActivateTenant, useRotateTenantKey } from '@/services/hooks/useTenants';
import type { Tenant } from '@/services/TenantService';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { toast } from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import ApolloIcon from '@/components/ui/ApolloIcon';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import ApiKeyModal from './ApiKeyModal';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500',
  suspended: 'bg-red-500',
  pending: 'bg-amber-500',
};

const TYPE_COLORS: Record<string, string> = {
  admin: 'bg-purple-500',
  manager: 'bg-blue-500',
  agent: 'bg-cyan-500',
};

export default function TenantsDashboard() {
  const router = useRouter();
  const { data: tenants, isLoading, error } = useTenants();
  const suspendMutation = useSuspendTenant();
  const activateMutation = useActivateTenant();
  const rotateKeyMutation = useRotateTenantKey();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Dialogs
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({ open: false, title: '', message: '', action: () => {} });

  const [apiKeyModal, setApiKeyModal] = useState<{
    open: boolean;
    apiKey: string;
    tenantName: string;
  }>({ open: false, apiKey: '', tenantName: '' });

  // Filtered tenants
  const filteredTenants = useMemo(() => {
    if (!tenants) return [];
    
    return tenants.filter((tenant) => {
      const matchesSearch =
        tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.tenantId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || tenant.type === filterType;
      const matchesStatus = filterStatus === 'all' || tenant.status === filterStatus;
      
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [tenants, searchTerm, filterType, filterStatus]);

  // Handle suspend tenant
  const handleSuspend = useCallback((tenant: Tenant) => {
    setConfirmDialog({
      open: true,
      title: 'Suspend Tenant',
      message: `Are you sure you want to suspend "${tenant.name}"? They will lose access to the platform.`,
      action: async () => {
        try {
          await suspendMutation.mutateAsync(tenant.tenantId);
          toast.push(
            <Notification title="Success" type="success">
              Tenant suspended successfully
            </Notification>
          );
        } catch (error: any) {
          toast.push(
            <Notification title="Error" type="danger">
              {error?.response?.data?.message || 'Failed to suspend tenant'}
            </Notification>
          );
        }
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
    });
  }, [suspendMutation]);

  // Handle activate tenant
  const handleActivate = useCallback((tenant: Tenant) => {
    setConfirmDialog({
      open: true,
      title: 'Activate Tenant',
      message: `Are you sure you want to activate "${tenant.name}"?`,
      action: async () => {
        try {
          await activateMutation.mutateAsync(tenant.tenantId);
          toast.push(
            <Notification title="Success" type="success">
              Tenant activated successfully
            </Notification>
          );
        } catch (error: any) {
          toast.push(
            <Notification title="Error" type="danger">
              {error?.response?.data?.message || 'Failed to activate tenant'}
            </Notification>
          );
        }
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
    });
  }, [activateMutation]);

  // Handle rotate API key
  const handleRotateKey = useCallback((tenant: Tenant) => {
    setConfirmDialog({
      open: true,
      title: 'Rotate API Key',
      message: `Are you sure you want to rotate the API key for "${tenant.name}"? The old key will stop working immediately.`,
      action: async () => {
        try {
          const response = await rotateKeyMutation.mutateAsync(tenant.tenantId);
          setApiKeyModal({
            open: true,
            apiKey: response.apiKey,
            tenantName: tenant.name,
          });
          toast.push(
            <Notification title="Success" type="success">
              API key rotated successfully
            </Notification>
          );
        } catch (error: any) {
          toast.push(
            <Notification title="Error" type="danger">
              {error?.response?.data?.message || 'Failed to rotate API key'}
            </Notification>
          );
        }
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
    });
  }, [rotateKeyMutation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size={40} />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-500">
          <ApolloIcon name="alert-circle" className="text-4xl mb-2" />
          <p>Failed to load tenants. Please check your admin secret configuration.</p>
          <p className="text-sm text-gray-500 mt-2">
            Make sure NEXT_PUBLIC_GATEWAY_ADMIN_SECRET is set in your environment.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Tenant Management</h1>
          <p className="text-sm text-gray-500">
            Manage organizations and their API access
          </p>
        </div>
        <Button
          variant="solid"
          size="sm"
          icon={<ApolloIcon name="plus" />}
          onClick={() => router.push('/admin/tenants/create')}
        >
          Create Tenant
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name, domain, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="agent">Agent</option>
          </select>
          
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold">{tenants?.length || 0}</div>
          <div className="text-sm text-gray-500">Total Tenants</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-emerald-500">
            {tenants?.filter((t) => t.status === 'active').length || 0}
          </div>
          <div className="text-sm text-gray-500">Active</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-red-500">
            {tenants?.filter((t) => t.status === 'suspended').length || 0}
          </div>
          <div className="text-sm text-gray-500">Suspended</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-amber-500">
            {tenants?.filter((t) => t.status === 'pending').length || 0}
          </div>
          <div className="text-sm text-gray-500">Pending</div>
        </Card>
      </div>

      {/* Tenants List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Domain
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  API Key
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requests
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No tenants found
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => (
                  <tr
                    key={tenant.tenantId}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/admin/tenants/${tenant.tenantId}`)}
                  >
                    <td className="px-4 py-4">
                      <div className="font-medium">{tenant.name}</div>
                      <div className="text-xs text-gray-500">{tenant.tenantId}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold text-white rounded-full ${TYPE_COLORS[tenant.type]}`}
                      >
                        {tenant.type}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm">{tenant.domain}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold text-white rounded-full ${STATUS_COLORS[tenant.status]}`}
                      >
                        {tenant.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {tenant.apiKeyPrefix}...
                      </code>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      {tenant.stats?.totalRequests?.toLocaleString() || 0}
                    </td>
                    <td className="px-4 py-4">
                      <div
                        className="flex items-center justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="default"
                          size="xs"
                          onClick={() => handleRotateKey(tenant)}
                        >
                          Rotate Key
                        </Button>
                        {tenant.status === 'active' ? (
                          <Button
                            variant="default"
                            size="xs"
                            className="text-red-500"
                            onClick={() => handleSuspend(tenant)}
                          >
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="xs"
                            className="text-emerald-500"
                            onClick={() => handleActivate(tenant)}
                          >
                            Activate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.open}
        title={confirmDialog.title}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
        onConfirm={confirmDialog.action}
        confirmText="Confirm"
        cancelText="Cancel"
      >
        <p>{confirmDialog.message}</p>
      </ConfirmDialog>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={apiKeyModal.open}
        onClose={() => setApiKeyModal((prev) => ({ ...prev, open: false }))}
        apiKey={apiKeyModal.apiKey}
        tenantName={apiKeyModal.tenantName}
      />
    </div>
  );
}
