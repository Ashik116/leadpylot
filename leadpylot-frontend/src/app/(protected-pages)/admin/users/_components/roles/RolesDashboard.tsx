'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useRoles, useDeleteRole, useCloneRole, useRefreshRoleCache } from '@/services/hooks/useRoles';
import { Role } from '@/services/RolesService';
import RoleFormSidebar from './RoleFormSidebar';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

const RolesDashboard = () => {
  const router = useRouter();

  // State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Data
  const { data: rolesData, isLoading, refetch } = useRoles();
  const deleteRoleMutation = useDeleteRole();
  const cloneRoleMutation = useCloneRole();
  const refreshCacheMutation = useRefreshRoleCache();

  const roles = rolesData?.roles || [];

  // Handlers
  const handleCreateRole = useCallback(() => {
    setSelectedRole(null);
    setIsCreating(true);
    setIsFormOpen(true);
  }, []);

  const handleEditRole = useCallback((role: Role) => {
    setSelectedRole(role);
    setIsCreating(false);
    setIsFormOpen(true);
  }, []);

  const handleViewPermissions = useCallback((role: Role) => {
    router.push(`/admin/roles/${role._id}`);
  }, [router]);

  const handleDeleteClick = useCallback((role: Role) => {
    setRoleToDelete(role);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (roleToDelete) {
      await deleteRoleMutation.mutateAsync(roleToDelete._id);
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
      refetch();
    }
  }, [roleToDelete, deleteRoleMutation, refetch]);

  const handleCloneRole = useCallback(async (role: Role) => {
    await cloneRoleMutation.mutateAsync({ id: role._id });
    refetch();
  }, [cloneRoleMutation, refetch]);

  const handleRefreshCache = useCallback(async () => {
    await refreshCacheMutation.mutateAsync();
  }, [refreshCacheMutation]);

  const handleFormClose = useCallback(() => {
    setIsFormOpen(false);
    setIsCreating(false);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setIsFormOpen(false);
    setIsCreating(false);
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-2 ">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Roles management <span className="text-lg font-normal text-gray-500">
              {roles.length} roles configured
            </span>
          </h2>

        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            icon={<ApolloIcon name="refresh" className="text-sm" />}
            onClick={handleRefreshCache}
            loading={refreshCacheMutation.isPending}
          >
            Sync Cache
          </Button>
          <Button
            variant="solid"
            size="sm"
            icon={<ApolloIcon name="plus" className="text-sm" />}
            onClick={handleCreateRole}
          >
            New Role
          </Button>
        </div>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2  xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {roles.map((role) => (
          <Card
            key={role._id}
            className="p-1 hover:shadow-md transition-shadow cursor-pointer group flex flex-col"
            onClick={() => handleViewPermissions(role)}
            bodyClass="flex flex-col justify-between h-full"
          >
            {/* body content */}
            <div className="flex-1">
              {/* Role Header */}
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: role.color || '#6366f1' }}
                  >
                    {(role.displayName || role.name).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold dark:text-white" style={{ color: 'var(--color-black)' }}>
                      {role.displayName || role.name}
                    </h4>
                    <p className="text-xs  dark:text-gray-400">
                      {role.name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {role.description && (
                <p className="text-sm  mb-1 line-clamp-2">
                  {role.description}
                </p>
              )}

              {/* Source Role Indicator */}
              {role.sourceRole && (
                <div className=" px-2 py-1 bg-blue-50 rounded text-xs w-auto inline-block">
                  <div className="flex items-center gap-1.5 text-evergreen">
                    <ApolloIcon name="link" className="text-xs" />
                    <span className="font-medium">
                      Child of: {typeof role.sourceRole === 'object'
                        ? (role.sourceRole.displayName || role.sourceRole.name)
                        : 'Source Role'}
                    </span>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 mb-1">
                <div className="flex items-center gap-1.5 text-sm  ">
                  <ApolloIcon name="shield" className="" />
                  <span>{role.permissions?.length || 0} permissions</span>
                  {/* {role.sourceRole && (
                    <span className="text-xs text-gray-500">
                      ({role.includePermissions?.length > 0 && `+${role.includePermissions.length}`}
                      {role.excludePermissions?.length > 0 && ` -${role.excludePermissions.length}`})
                    </span>
                  )} */}
                </div>
                <Badge
                  className={`text-xs px-2 rounded-full ${role.active
                    ? 'bg-evergreen/10 text-evergreen'
                    : 'bg-rust/10 text-rust'
                    }`}
                >
                  {role.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            {/* Actions */}
            <div
              className="flex  items-center px-0  gap-3 border-t border-gray-200"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="plain"
                size="xs"
                icon={<ApolloIcon name="shield" className="text-sm" />}
                onClick={() => handleViewPermissions(role)}
                className="px-0"
              >
                Permissions
              </Button>
              <Button
                variant="plain"
                size="xs"
                icon={<ApolloIcon name="pen" className="text-sm" />}
                onClick={() => handleEditRole(role)}
                className="px-0"
              >
                Edit
              </Button>
              <Button
                variant="plain"
                size="xs"
                icon={<ApolloIcon name="copy" className="text-sm" />}
                onClick={() => handleCloneRole(role)}
                loading={cloneRoleMutation.isPending}
                className="px-0"
              >
                Clone
              </Button>
              {!role.isSystem && (
                <Button
                  variant="plain"
                  size="xs"
                  className="text-rust hover:text-rust/80 ml-auto px-0 mt-1.5"
                  icon={<ApolloIcon name="trash" className="text-sm" />}
                  onClick={() => handleDeleteClick(role)}
                />
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {roles.length === 0 && (
        <Card className="p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center ">
            <ApolloIcon name="shield" className="text-2xl text-gray-400" />
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-1">
            No Roles Found
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Create your first role to get started
          </p>
          <Button variant="solid" size="sm" onClick={handleCreateRole}>
            Create Role
          </Button>
        </Card>
      )}

      {/* Role Form Sidebar */}
      <RoleFormSidebar
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        role={isCreating ? null : selectedRole}
        isCreating={isCreating}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        type="danger"
        title="Delete Role"
        onClose={() => setDeleteDialogOpen(false)}
        onRequestClose={() => setDeleteDialogOpen(false)}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        confirmButtonProps={{
          loading: deleteRoleMutation.isPending,
          disabled: deleteRoleMutation.isPending,
        }}
        overlayClassName="!z-40"
        portalClassName="!z-40"
      >
        <p>
          Are you sure you want to delete <strong>&quot;{roleToDelete?.displayName || roleToDelete?.name}&quot;</strong>?
          This action cannot be undone.
        </p>
      </ConfirmDialog>
    </div>
  );
};

export default RolesDashboard;
