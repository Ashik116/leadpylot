'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Dialog from '@/components/ui/Dialog';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { HiArrowPath, HiPlus, HiNoSymbol, HiTrash, HiExclamationTriangle } from 'react-icons/hi2';
import SecurityService from '@/services/SecurityService';

interface BlockedIP {
  _id: string;
  ipAddress: string;
  blockType: string;
  blockReason: string;
  blockedBy: {
    _id: string;
    login: string;
    role: string;
  } | null;
  blockedAt: string;
  expiresAt?: string;
  attemptCount: number;
  geolocation: {
    country?: string;
    countryCode?: string;
    region?: string;
    city?: string;
    isp?: string;
  };
  notes: string;
  isActive: boolean;
}

interface BlockedIPsProps {
  onUpdate: () => void;
}

const BlockedIPs: React.FC<BlockedIPsProps> = ({ onUpdate }) => {
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });

  // Form state for adding new blocked IP
  const [newBlockForm, setNewBlockForm] = useState({
    ipAddress: '',
    reason: 'manual_block',
    blockType: 'manual',
    expirationHours: 24,
    notes: '',
  });

  const blockReasons = [
    { value: 'too_many_failed_attempts', label: 'Too Many Failed Attempts' },
    { value: 'suspicious_activity', label: 'Suspicious Activity' },
    { value: 'manual_block', label: 'Manual Block' },
    { value: 'security_threat', label: 'Security Threat' },
    { value: 'spam', label: 'Spam' },
  ];

  const blockTypes = [
    { value: 'temporary', label: 'Temporary' },
    { value: 'permanent', label: 'Permanent' },
    { value: 'manual', label: 'Manual' },
  ];

  const fetchBlockedIPs = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const result = await SecurityService.getBlockedIPs({
          page,
          limit: pagination?.limit,
        });

        if (result?.success) {
          setBlockedIPs(result?.data?.data as any[]);
          setPagination(result?.data?.pagination);
        }
      } catch (error) {
        console.error('Error fetching blocked IPs:', error);
        toast.push(
          <Notification type="danger" title="Error">
            Failed to load blocked IPs
          </Notification>
        );
      } finally {
        setLoading(false);
      }
    },
    [pagination?.limit]
  );

  const handleAddBlock = async () => {
    try {
      if (!newBlockForm.ipAddress) {
        toast.push(
          <Notification type="danger" title="Error">
            IP address is required
          </Notification>
        );
        return;
      }

      const result = await SecurityService.blockIP({
        ipAddress: newBlockForm?.ipAddress,
        reason: newBlockForm?.reason,
        blockType: newBlockForm?.blockType,
        expirationHours:
          newBlockForm?.blockType === 'temporary' ? newBlockForm?.expirationHours : undefined,
        notes: newBlockForm?.notes,
      });

      if (!result.success) {
        throw new Error('Failed to block IP');
      }

      toast.push(
        <Notification type="success" title="Success">
          IP {newBlockForm.ipAddress} has been blocked
        </Notification>
      );
      setShowAddModal(false);
      setNewBlockForm({
        ipAddress: '',
        reason: 'manual_block',
        blockType: 'manual',
        expirationHours: 24,
        notes: '',
      });
      fetchBlockedIPs(pagination.page);
      onUpdate();
    } catch (error) {
      console.error('Error blocking IP:', error);
      toast.push(
        <Notification type="danger" title="Error">
          Failed to block IP address
        </Notification>
      );
    }
  };

  const handleUnblock = async (id: string, ipAddress: string) => {
    if (!confirm(`Are you sure you want to unblock IP "${ipAddress}"?`)) {
      return;
    }

    try {
      const result = await SecurityService.unblockIP(id);

      if (!result.success) {
        throw new Error('Failed to unblock IP');
      }

      toast.push(
        <Notification type="success" title="Success">
          IP {ipAddress} has been unblocked
        </Notification>
      );
      fetchBlockedIPs(pagination.page);
      onUpdate();
    } catch (error) {
      console.error('Error unblocking IP:', error);
      toast.push(
        <Notification type="danger" title="Error">
          Failed to unblock IP address
        </Notification>
      );
    }
  };

  useEffect(() => {
    fetchBlockedIPs(1);
  }, [fetchBlockedIPs]);

  const getBlockTypeColor = (blockType: string) => {
    const colors: Record<string, string> = {
      temporary: 'bg-yellow-100 text-yellow-800 ',
      permanent: 'bg-red-100 text-red-800 ',
      manual: 'bg-blue-100 text-blue-800 ',
      automatic: 'bg-purple-100 text-purple-800 ',
    };
    return colors[blockType] || colors.manual;
  };

  const getReasonLabel = (reason: string) => {
    const reasonMap: Record<string, string> = {
      too_many_failed_attempts: 'Too Many Failed Attempts',
      suspicious_activity: 'Suspicious Activity',
      manual_block: 'Manual Block',
      security_threat: 'Security Threat',
      spam: 'Spam',
    };
    return reasonMap[reason] || reason;
  };

  const isExpired = (expiresAt: string | undefined) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getTimeRemaining = (expiresAt: string | undefined) => {
    if (!expiresAt) return 'Never';

    const expires = new Date(expiresAt);
    const now = new Date();

    if (expires < now) return 'Expired';

    const diffMs = expires.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 24) {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ${diffHours % 24}h`;
    }
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
  };

  const columns = [
    {
      header: 'IP Address',
      accessorKey: 'ipAddress',
      cell: ({ row }: any) => (
        <span className="font-mono text-sm text-gray-900">{row?.original?.ipAddress}</span>
      ),
    },
    {
      header: 'Location',
      accessorKey: 'geolocation',
      cell: ({ row }: any) => {
        const geo = row.original?.geolocation;
        return (
          <div className="text-sm">
            <div>
              {geo?.city || 'Unknown'}, {geo?.country || 'Unknown'}
            </div>
            {geo?.isp && <div className="text-xs text-gray-500">{geo?.isp}</div>}
          </div>
        );
      },
    },
    {
      header: 'Block Type',
      accessorKey: 'blockType',
      cell: ({ row }: any) => (
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${getBlockTypeColor(row.original?.blockType)}`}
        >
          {row.original?.blockType}
        </span>
      ),
    },
    {
      header: 'Reason',
      accessorKey: 'blockReason',
      cell: ({ row }: any) => (
        <div className="text-sm">
          <div>{getReasonLabel(row.original?.blockReason)}</div>
          {row.original?.attemptCount > 0 && (
            <div className="text-xs text-gray-500">
              {row.original?.attemptCount} failed attempts
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Blocked By',
      accessorKey: 'blockedBy',
      cell: ({ row }: any) => (
        <div className="text-sm">
          {row.original?.blockedBy ? (
            <div>
              <div>{row.original?.blockedBy?.login}</div>
              <div className="text-xs text-gray-500">{row.original?.blockedBy?.role}</div>
            </div>
          ) : (
            <span className="text-gray-500">System</span>
          )}
        </div>
      ),
    },
    {
      header: 'Blocked At',
      accessorKey: 'blockedAt',
      cell: ({ row }: any) => (
        <div className="text-sm">
          <div>{new Date(row.original?.blockedAt).toLocaleDateString()}</div>
          <div className="text-gray-500">
            {new Date(row.original?.blockedAt).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
    {
      header: 'Expires',
      accessorKey: 'expiresAt',
      cell: ({ row }: any) => {
        const timeRemaining = getTimeRemaining(row.original?.expiresAt);
        const expired = isExpired(row.original?.expiresAt);

        return <div className={`text-sm ${expired ? 'text-red-600' : ''}`}>{timeRemaining}</div>;
      },
    },
    {
      header: 'Actions',
      accessorKey: 'actions',
      cell: ({ row }: any) => (
        <Button
          size="sm"
          onClick={() => handleUnblock(row.original?._id, row.original?.ipAddress)}
          className="border border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700"
        >
          <HiTrash className="mr-1 h-4 w-4" />
          Unblock
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
            <HiNoSymbol className="h-6 w-6 text-red-500" />
            Blocked IP Addresses
          </h2>
          <p className="mt-1 text-sm text-gray-600">Manage IP address restrictions and blocklist</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => fetchBlockedIPs(pagination?.page)}
            disabled={loading}
            className="flex items-center gap-2 border border-gray-300"
          >
            <HiArrowPath className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
            <HiPlus className="h-4 w-4" />
            Block IP
          </Button>
        </div>
      </div>

      {/* Results */}
      <Card>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {columns?.length > 0 &&
                      columns?.map((column) => (
                        <th
                          key={column?.accessorKey}
                          className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                        >
                          {column?.header}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {blockedIPs?.length > 0 &&
                    blockedIPs?.map((ip) => (
                      <tr key={ip._id}>
                        {columns?.length > 0 &&
                          columns?.map((column) => (
                            <td
                              key={column?.accessorKey}
                              className="px-6 py-4 text-sm whitespace-nowrap text-gray-900"
                            >
                              {column?.cell
                                ? column?.cell({ row: { original: ip } })
                                : (ip as any)[column?.accessorKey]}
                            </td>
                          ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {blockedIPs?.length === 0 && (
              <div className="py-12 text-center">
                <HiNoSymbol className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">No Blocked IPs</h3>
                <p className="text-gray-500">No IP addresses are currently blocked.</p>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Add Block Dialog */}
      <Dialog isOpen={showAddModal} onClose={() => setShowAddModal(false)}>
        <div className="px-6 py-2">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Block IP Address</h3>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">IP Address</label>
              <Input
                type="text"
                placeholder="e.g., 192.168.1.100"
                value={newBlockForm?.ipAddress}
                onChange={(e) =>
                  setNewBlockForm((prev) => ({ ...prev, ipAddress: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Block Reason</label>
              <Select
                value={newBlockForm?.reason}
                onChange={(value) => setNewBlockForm((prev) => ({ ...prev, reason: value || '' }))}
              >
                {blockReasons?.length > 0 &&
                  blockReasons?.map((reason) => (
                    <option key={reason?.value} value={reason?.value}>
                      {reason?.label}
                    </option>
                  ))}
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Block Type</label>
              <Select
                value={newBlockForm?.blockType}
                onChange={(value) =>
                  setNewBlockForm((prev) => ({ ...prev, blockType: value || '' }))
                }
              >
                {blockTypes?.length > 0 &&
                  blockTypes?.map((type) => (
                    <option key={type?.value} value={type?.value}>
                      {type?.label}
                    </option>
                  ))}
              </Select>
            </div>

            {newBlockForm?.blockType === 'temporary' && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Expiration (hours)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="8760"
                  value={newBlockForm?.expirationHours}
                  onChange={(e) =>
                    setNewBlockForm((prev) => ({
                      ...prev,
                      expirationHours: parseInt(e.target.value) || 24,
                    }))
                  }
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Notes (optional)
              </label>
              <Input
                placeholder="Additional notes about this block..."
                value={newBlockForm?.notes}
                onChange={(e) => setNewBlockForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <HiExclamationTriangle className="h-5 w-5 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                Blocking an IP address will prevent all login attempts from that address.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button onClick={() => setShowAddModal(false)} className="border border-gray-300">
                Cancel
              </Button>
              <Button
                onClick={handleAddBlock}
                className="bg-red-600 text-white hover:bg-red-700"
                icon={<HiNoSymbol className="h-4 w-4" />}
              >
                Block IP
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default BlockedIPs;
