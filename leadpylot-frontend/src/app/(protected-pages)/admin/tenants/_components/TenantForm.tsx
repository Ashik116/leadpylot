'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateTenant, useUpdateTenant, useTenant } from '@/services/hooks/useTenants';
import type { CreateTenantRequest, UpdateTenantRequest } from '@/services/TenantService';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { toast } from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import ApolloIcon from '@/components/ui/ApolloIcon';
import ApiKeyModal from './ApiKeyModal';

interface TenantFormProps {
  tenantId?: string;
  mode: 'create' | 'edit';
}

export default function TenantForm({ tenantId, mode }: TenantFormProps) {
  const router = useRouter();
  const { data: existingTenant, isLoading: loadingTenant } = useTenant(tenantId);
  const createMutation = useCreateTenant();
  const updateMutation = useUpdateTenant();

  const [formData, setFormData] = useState<{
    name: string;
    type: 'agent' | 'manager' | 'admin';
    domain: string;
    status?: 'active' | 'suspended' | 'pending';
    requestsPerMinute: number;
    requestsPerHour: number;
  }>({
    name: '',
    type: 'agent',
    domain: '',
    status: 'active',
    requestsPerMinute: 100,
    requestsPerHour: 5000,
  });

  const [apiKeyModal, setApiKeyModal] = useState<{
    open: boolean;
    apiKey: string;
    tenantName: string;
  }>({ open: false, apiKey: '', tenantName: '' });

  // Load existing tenant data
  useState(() => {
    if (existingTenant && mode === 'edit') {
      setFormData({
        name: existingTenant.name,
        type: existingTenant.type,
        domain: existingTenant.domain,
        status: existingTenant.status,
        requestsPerMinute: existingTenant.rateLimit?.requestsPerMinute || 100,
        requestsPerHour: existingTenant.rateLimit?.requestsPerHour || 5000,
      });
    }
  });

  // Update form when tenant data loads
  if (existingTenant && mode === 'edit' && formData.name === '') {
    setFormData({
      name: existingTenant.name,
      type: existingTenant.type,
      domain: existingTenant.domain,
      status: existingTenant.status,
      requestsPerMinute: existingTenant.rateLimit?.requestsPerMinute || 100,
      requestsPerHour: existingTenant.rateLimit?.requestsPerHour || 5000,
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.domain) {
      toast.push(
        <Notification title="Validation Error" type="warning">
          Name and domain are required
        </Notification>
      );
      return;
    }

    try {
      if (mode === 'create') {
        const data: CreateTenantRequest = {
          name: formData.name,
          type: formData.type,
          domain: formData.domain,
        };

        const response = await createMutation.mutateAsync(data);

        // Show the API key modal
        setApiKeyModal({
          open: true,
          apiKey: response.apiKey,
          tenantName: formData.name,
        });

        toast.push(
          <Notification title="Success" type="success">
            Tenant created successfully
          </Notification>
        );
      } else {
        if (!tenantId) return;

        const data: UpdateTenantRequest = {
          name: formData.name,
          status: formData.status,
          rateLimit: {
            requestsPerMinute: formData.requestsPerMinute,
            requestsPerHour: formData.requestsPerHour,
          },
        };

        await updateMutation.mutateAsync({ tenantId, data });

        toast.push(
          <Notification title="Success" type="success">
            Tenant updated successfully
          </Notification>
        );

        router.push('/admin/tenants');
      }
    } catch (error: any) {
      toast.push(
        <Notification title="Error" type="danger">
          {error?.response?.data?.message || `Failed to ${mode} tenant`}
        </Notification>
      );
    }
  };

  if (loadingTenant && mode === 'edit') {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size={40} />
      </div>
    );
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">
              {mode === 'create' ? 'Create New Tenant' : 'Edit Tenant'}
            </h2>
            <p className="text-sm text-gray-500">
              {mode === 'create'
                ? 'Set up a new organization with API access'
                : 'Update tenant configuration'}
            </p>
          </div>
          <Button
            variant="default"
            size="sm"
            icon={<ApolloIcon name="arrow-left" />}
            onClick={() => router.push('/admin/tenants')}
          >
            Back
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tenant Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Acme Corporation"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tenant Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as 'agent' | 'manager' | 'admin',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={mode === 'edit'}
              >
                <option value="agent">Agent - Basic access for sales agents</option>
                <option value="manager">Manager - Extended access with reporting</option>
                <option value="admin">Admin - Full access to all features</option>
              </select>
              {mode === 'edit' && (
                <p className="text-xs text-gray-500 mt-1">
                  Tenant type cannot be changed after creation
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Domain *
              </label>
              <input
                type="text"
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                placeholder="e.g., acme.leadpylot.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={mode === 'edit'}
                required
              />
              {mode === 'edit' && (
                <p className="text-xs text-gray-500 mt-1">
                  Domain cannot be changed after creation
                </p>
              )}
            </div>

            {mode === 'edit' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as 'active' | 'suspended' | 'pending',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            )}
          </div>

          {/* Rate Limits (Edit mode only) */}
          {mode === 'edit' && (
            <div className="border-t pt-6">
              <h3 className="text-md font-medium mb-4">Rate Limits</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Requests per Minute
                  </label>
                  <input
                    type="number"
                    value={formData.requestsPerMinute}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requestsPerMinute: parseInt(e.target.value) || 100,
                      })
                    }
                    min={1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Requests per Hour
                  </label>
                  <input
                    type="number"
                    value={formData.requestsPerHour}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requestsPerHour: parseInt(e.target.value) || 5000,
                      })
                    }
                    min={1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tenant Info (Edit mode) */}
          {mode === 'edit' && existingTenant && (
            <div className="border-t pt-6">
              <h3 className="text-md font-medium mb-4">Tenant Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Tenant ID:</span>
                  <p className="font-mono">{existingTenant.tenantId}</p>
                </div>
                <div>
                  <span className="text-gray-500">API Key Prefix:</span>
                  <p className="font-mono">{existingTenant.apiKeyPrefix}...</p>
                </div>
                <div>
                  <span className="text-gray-500">Total Requests:</span>
                  <p>{existingTenant.stats?.totalRequests?.toLocaleString() || 0}</p>
                </div>
                <div>
                  <span className="text-gray-500">Created:</span>
                  <p>{new Date(existingTenant.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t pt-6">
            <Button
              variant="default"
              type="button"
              onClick={() => router.push('/admin/tenants')}
            >
              Cancel
            </Button>
            <Button
              variant="solid"
              type="submit"
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {mode === 'create' ? 'Create Tenant' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>

      {/* API Key Modal (for new tenant) */}
      <ApiKeyModal
        isOpen={apiKeyModal.open}
        onClose={() => {
          setApiKeyModal((prev) => ({ ...prev, open: false }));
          router.push('/admin/tenants');
        }}
        apiKey={apiKeyModal.apiKey}
        tenantName={apiKeyModal.tenantName}
      />
    </>
  );
}
