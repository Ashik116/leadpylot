'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useRole, useChildRoles } from '@/services/hooks/useRoles';
import PermissionMatrixTable from './_components/PermissionMatrixTable';

interface RoleDetailsPageProps {
  params: Promise<{ id: string }>;
}

function RoleDetailsPage({ params }: RoleDetailsPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: role, isLoading } = useRole(id);
  const { data: childRoles, isLoading: isLoadingChildren } = useChildRoles(id);

  const sourceRoleId = role?.sourceRole
    ? (typeof role.sourceRole === 'string' ? role.sourceRole : role.sourceRole._id)
    : undefined;
  const { data: sourceRole } = useRole(sourceRoleId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={40} />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <ApolloIcon name="shield" className="text-4xl text-gray-400" />
        <p className="text-gray-500 dark:text-gray-400">Role not found</p>
        <Button variant="solid" size="sm" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Back Button */}
      {/* Compact Role Info Card */}
      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Back Button */}
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center w-7 h-7 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-gray-600 hover:text-gray-900 shrink-0"
              aria-label="Go back"
            >
              <ApolloIcon name="arrow-left" className="text-base" />
            </button>

            {/* Role Avatar */}
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm"
              style={{ backgroundColor: role.color || '#6366f1' }}
            >
              {(role.displayName || role.name).charAt(0).toUpperCase()}
            </div>

            {/* Title and Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-base font-bold text-gray-900">
                {role.displayName || role.name}
              </h1>
              {role.isSystem && (
                <Badge className="bg-amber-100 text-amber-800 text-xxs border border-amber-200 px-1.5 py-0.5">
                  System
                </Badge>
              )}
              <Badge
                className={`text-xxs border px-1.5 py-0.5 rounded ${role.active
                  ? 'bg-evergreen/10 text-evergreen border-evergreen/20'
                  : 'bg-rust/10 text-rust border-rust/20'
                  }`}
              >
                {role.active ? 'Active' : 'Inactive'}
              </Badge>
              <span className="text-xs text-gray-500 font-mono">
                {role.name}
              </span>
            </div>

            {/* Divider */}
            <div className="h-4 w-px bg-gray-300" />

            {/* Compact Stats */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <span className="text-xxs font-semibold text-gray-500 uppercase tracking-wider">
                  Permissions
                </span>
                <span className="text-base font-bold text-gray-900 ml-1">
                  {role.permissions?.length || 0}
                </span>
                {role.sourceRole && (
                  <span className="text-xxs text-gray-500 ml-1">
                    ({sourceRole?.permissions?.length || 0}
                    {role.includePermissions?.length > 0 && `+${role.includePermissions.length}`}
                    {role.excludePermissions?.length > 0 && `-${role.excludePermissions.length}`})
                  </span>
                )}
              </div>
              <div className="h-4 w-px bg-gray-300" />
              <div className="flex items-center gap-1">
                <span className="text-xxs font-semibold text-gray-500 uppercase tracking-wider">
                  Level
                </span>
                <span className="text-base font-bold text-gray-900 ml-1">
                  {role.hierarchyLevel}
                </span>
              </div>
              <div className="h-4 w-px bg-gray-300" />
              <div className="flex items-center gap-1">
                <span className="text-xxs font-semibold text-gray-500 uppercase tracking-wider">
                  Updated
                </span>
                <span className="text-sm font-bold text-gray-900 ml-1">
                  {new Date(role.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Description - Compact Inline */}
            {role.description && (
              <>
                <div className="h-4 w-px bg-gray-300" />
                <div className="group relative flex items-center gap-1.5">
                  <ApolloIcon name="file" className="text-gray-400 text-xs shrink-0" />
                  <span
                    className="text-xs text-gray-600 max-w-[200px] truncate cursor-help"
                    title={role.description}
                  >
                    {role.description}
                  </span>
                </div>
              </>
            )}

            {/* Source Role - Compact Inline Link */}
            {role.sourceRole && sourceRole && (
              <>
                <div className="h-4 w-px bg-gray-300" />
                <button
                  onClick={() => router.push(`/admin/roles/${sourceRole._id}`)}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-gray-50 transition-colors group"
                  title={`View source role: ${sourceRole.displayName || sourceRole.name}`}
                >
                  <ApolloIcon name="link" className="text-blue-500 text-xs shrink-0" />
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center text-white font-bold text-xxs shrink-0"
                    style={{ backgroundColor: sourceRole.color || '#6366f1' }}
                  >
                    {(sourceRole.displayName || sourceRole.name).charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-blue-700 group-hover:text-blue-900">
                    {sourceRole.displayName || sourceRole.name}
                  </span>
                  <ApolloIcon name="arrow-right" className="text-blue-500 text-xxs opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </>
            )}

            {/* Child Roles - Compact Inline */}
            {childRoles && childRoles.length > 0 && (
              <>
                <div className="h-4 w-px bg-gray-300" />
                <div className="group relative flex items-center gap-1.5">
                  <ApolloIcon name="users" className="text-green-500 text-xs shrink-0" />
                  <span className="text-xs text-gray-600">
                    {childRoles.length} {childRoles.length === 1 ? 'child' : 'children'}
                  </span>
                  {/* Hover dropdown for child roles */}
                  <div className="absolute left-0 top-full mt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[200px]">
                    <div className="text-xxs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 px-1">
                      Child Roles
                    </div>
                    <div className="space-y-1">
                      {childRoles.map((child) => (
                        <button
                          key={child._id}
                          onClick={() => router.push(`/admin/roles/${child._id}`)}
                          className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 transition-colors text-left group/item"
                        >
                          <div
                            className="w-4 h-4 rounded flex items-center justify-center text-white font-bold text-xxs shrink-0"
                            style={{ backgroundColor: child.color || '#6366f1' }}
                          >
                            {(child.displayName || child.name).charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-medium text-gray-700 group-hover/item:text-gray-900 flex-1 truncate">
                            {child.displayName || child.name}
                          </span>
                          <ApolloIcon name="arrow-right" className="text-gray-400 text-xxs opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Permission Matrix Section */}
        <div className="bg-white mx-5">
          {/* Table Container */}
          <div className="p-0">
            <PermissionMatrixTable key={role._id} role={role} />
          </div>
        </div>
      </Card>
    </div>
  );
}

export default RoleDetailsPage;
