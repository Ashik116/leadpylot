'use client';

import { useState } from 'react';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';
import { useAuditLogs } from '@/services/hooks/useRoles';
import { AuditLog } from '@/services/RolesService';
import { formatDistanceToNow } from 'date-fns';

interface AuditLogsPanelProps {
  roleId?: string;
}

const ACTION_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
  'role:created': { label: 'Created', bgColor: 'bg-evergreen/10', textColor: 'text-evergreen' },
  'role:updated': { label: 'Updated', bgColor: 'bg-ocean-2/10', textColor: 'text-ocean-2' },
  'role:deleted': { label: 'Deleted', bgColor: 'bg-rust/10', textColor: 'text-rust' },
  'role:cloned': { label: 'Cloned', bgColor: 'bg-purple-100 dark:bg-purple-900/30', textColor: 'text-purple-700 dark:text-purple-300' },
  'role:activated': { label: 'Activated', bgColor: 'bg-evergreen/10', textColor: 'text-evergreen' },
  'role:deactivated': { label: 'Deactivated', bgColor: 'bg-gray-100 dark:bg-gray-700', textColor: 'text-gray-700 dark:text-gray-300' },
  'permission:added': { label: 'Permission Added', bgColor: 'bg-ocean-2/10', textColor: 'text-ocean-2' },
  'permission:removed': { label: 'Permission Removed', bgColor: 'bg-amber-100 dark:bg-amber-900/30', textColor: 'text-amber-700 dark:text-amber-400' },
  'permission:bulk_added': { label: 'Permissions Added', bgColor: 'bg-ocean-2/10', textColor: 'text-ocean-2' },
  'permission:bulk_removed': { label: 'Permissions Removed', bgColor: 'bg-amber-100 dark:bg-amber-900/30', textColor: 'text-amber-700 dark:text-amber-400' },
  'user:role_assigned': { label: 'Role Assigned', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30', textColor: 'text-cyan-700 dark:text-cyan-300' },
  'user:role_changed': { label: 'Role Changed', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30', textColor: 'text-cyan-700 dark:text-cyan-300' },
  'system:roles_seeded': { label: 'Roles Seeded', bgColor: 'bg-gray-100 dark:bg-gray-700', textColor: 'text-gray-700 dark:text-gray-300' },
  'system:permissions_seeded': { label: 'Permissions Seeded', bgColor: 'bg-gray-100 dark:bg-gray-700', textColor: 'text-gray-700 dark:text-gray-300' },
};

const AuditLogsPanel = ({ roleId }: AuditLogsPanelProps) => {
  const [page, setPage] = useState(1);
  const limit = 15;

  const { data, isLoading } = useAuditLogs({
    page,
    limit,
    entityType: 'role',
    entityId: roleId,
  });

  const logs = data?.logs || [];
  const pagination = data?.pagination;

  const getActionBadge = (action: string) => {
    const config = ACTION_CONFIG[action] || {
      label: action.replace(/[_:]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      bgColor: 'bg-gray-100 dark:bg-gray-700',
      textColor: 'text-gray-700 dark:text-gray-300',
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.textColor}`}>
        {config.label}
      </span>
    );
  };

  const formatChanges = (log: AuditLog) => {
    if (!log.changes || log.changes.length === 0) {
      if (log.metadata) {
        const metadata = log.metadata as { added?: string[]; removed?: string[] };
        if (metadata.added && metadata.added.length > 0) {
          return (
            <span className="text-evergreen text-xs">
              +{metadata.added.length} permissions
            </span>
          );
        }
        if (metadata.removed && metadata.removed.length > 0) {
          return (
            <span className="text-rust text-xs">
              -{metadata.removed.length} permissions
            </span>
          );
        }
      }
      return null;
    }

    return (
      <div className="text-xs space-y-0.5 mt-1">
        {log.changes.slice(0, 2).map((change, idx) => (
          <div key={idx} className="text-gray-500 dark:text-gray-400">
            <span className="font-medium">{change.field}:</span>{' '}
            {change.field === 'permissions' ? (
              <span>
                {Array.isArray(change.oldValue) ? change.oldValue.length : 0} → {Array.isArray(change.newValue) ? change.newValue.length : 0}
              </span>
            ) : (
              <span className="truncate">
                {String(change.oldValue).substring(0, 20)} → {String(change.newValue).substring(0, 20)}
              </span>
            )}
          </div>
        ))}
        {log.changes.length > 2 && (
          <div className="text-gray-400 dark:text-gray-500">
            +{log.changes.length - 2} more
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Spinner size={32} />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400 text-sm">No audit logs found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Logs List */}
      <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
        {logs.map((log) => (
          <div
            key={log._id}
            className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-2">
                  {getActionBadge(log.action)}
                  {log.entityName && (
                    <span className="font-medium text-gray-900 dark:text-white text-sm">
                      {log.entityName}
                    </span>
                  )}
                </div>
                
                {formatChanges(log)}

                <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    by{' '}
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {log.performedBy?.login || log.performerSnapshot?.login || 'System'}
                    </span>
                  </span>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <span>
                    {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center pt-2 border-t border-gray-200 dark:border-gray-700">
          <Pagination
            currentPage={page}
            total={pagination.total}
            pageSize={limit}
            onChange={(newPage) => setPage(newPage)}
          />
        </div>
      )}
    </div>
  );
};

export default AuditLogsPanel;
