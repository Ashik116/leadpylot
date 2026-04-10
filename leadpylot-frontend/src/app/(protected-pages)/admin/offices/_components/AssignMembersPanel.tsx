'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import Select from '@/components/ui/Select';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useOfficeEmployees, useAssignEmployees, useRemoveEmployee } from '@/services/hooks/useOffices';
import { apiGetUsers } from '@/services/UsersService';
import { useQuery } from '@tanstack/react-query';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { Controller, useForm } from 'react-hook-form';

interface AssignMembersPanelProps {
  officeId: string;
  officeName: string;
  onClose: () => void;
}

type AddUsersForm = { userIds: string[] };

export default function AssignMembersPanel({ officeId, officeName, onClose }: AssignMembersPanelProps) {
  const [removeTarget, setRemoveTarget] = useState<{ userId: string; name: string } | null>(null);

  const { data: employeesData, isLoading } = useOfficeEmployees(officeId, { limit: 100 });
  const { data: usersData } = useQuery({
    queryKey: ['users', 'list-for-assign', 1, 200],
    queryFn: () => apiGetUsers({ page: 1, limit: 200 }),
    staleTime: 60 * 1000,
  });

  const assignMutation = useAssignEmployees(officeId);
  const removeMutation = useRemoveEmployee(officeId);

  const { control, handleSubmit, reset, watch } = useForm<AddUsersForm>({ defaultValues: { userIds: [] } });
  const selectedIds = watch('userIds') ?? [];

  const employees = employeesData?.users ?? [];
  const users = usersData?.data ?? [];
  const existingIds = new Set(employees.map((e: { _id: string }) => e._id));
  const availableUsers = users.filter((u: { _id: string }) => !existingIds.has(u._id));

  const userOptions = availableUsers.map((u: { _id: string; login?: string; info?: { name?: string } }) => ({
    value: u._id,
    label: u.info?.name || u.login || u._id,
  }));

  const onAssign = (data: AddUsersForm) => {
    const ids = Array.isArray(data.userIds) ? data.userIds.filter(Boolean) : [];
    if (ids.length === 0) return;
    assignMutation.mutate(
      { userIds: ids },
      {
        onSuccess: () => {
          reset({ userIds: [] });
        },
      }
    );
  };

  const handleConfirmRemove = () => {
    if (!removeTarget) return;
    removeMutation.mutate(removeTarget.userId, {
      onSuccess: () => {
        setRemoveTarget(null);
      },
    });
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Assign members — {officeName}</h2>
        <Button
          variant="secondary"
          size="xs"
          icon={<ApolloIcon name="times" className="text-md" />}
          onClick={onClose}
          aria-label="Close"
        />
      </div>

      {/* Add users - multi-select */}
      <Card className="rounded-lg border border-gray-200 bg-gray-50/50 shadow-sm" bodyClass="p-4">
        <h3 className="mb-3 text-sm font-medium text-gray-700">Add users to office</h3>
        <form onSubmit={handleSubmit(onAssign)} className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3">
          <div className="min-w-0 flex-1">
            <label htmlFor="assign-users-select" className="mb-1.5 block text-xs font-medium text-gray-600">
              Select one or more users
            </label>
            <Controller
              name="userIds"
              control={control}
              render={({ field }) => {
                const selected = userOptions.filter((o) => (field.value ?? []).includes(o.value));
                return (
                  <Select
                    id="assign-users-select"
                    isMulti
                    placeholder="Choose users..."
                    className="w-full"
                    options={userOptions}
                    value={selected}
                    onChange={(newValue: readonly { value: string; label: string }[] | null) => {
                      const ids = newValue ? Array.from(newValue, (s) => s.value) : [];
                      field.onChange(ids);
                    }}
                    isDisabled={assignMutation.isPending}
                  />
                );
              }}
            />
          </div>
          <Button
            type="submit"
            size="sm"
            variant="solid"
            disabled={selectedIds.length === 0 || assignMutation.isPending}
            loading={assignMutation.isPending}
            icon={<ApolloIcon name="user-plus" className="text-sm" />}
          >
            Add {selectedIds.length > 0 ? `(${selectedIds.length})` : ''} to office
          </Button>
        </form>
      </Card>

      {/* Current members list */}
      <Card className="rounded-lg border border-gray-200 shadow-sm" bodyClass="p-4">
        <h3 className="mb-3 text-sm font-medium text-gray-700">
          Current members <span className="font-normal text-gray-500">({employees.length})</span>
        </h3>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size={28} />
          </div>
        ) : employees.length === 0 ? (
          <p className="rounded-md border border-dashed border-gray-200 bg-gray-50/50 py-6 text-center text-sm text-gray-500">
            No members assigned yet. Add users above.
          </p>
        ) : (
          <ul className="max-h-[45vh] space-y-1 overflow-y-auto rounded-md border border-gray-100">
            {employees.map((emp: { _id: string; login?: string; info?: { name?: string }; email?: string }) => (
              <li
                key={emp._id}
                className="flex items-center justify-between gap-2 border-b border-gray-50 px-3 py-2.5 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-900">
                    {emp.info?.name || emp.login || '—'}
                  </span>
                  {emp.email && (
                    <span className="block truncate text-xs text-gray-500">{emp.email}</span>
                  )}
                </div>
                <Button
                  size="xs"
                  variant="plain"
                  className="shrink-0 text-gray-500 hover:text-red-600"
                  icon={<ApolloIcon name="user-minus" className="text-sm" />}
                  onClick={() =>
                    setRemoveTarget({
                      userId: emp._id,
                      name: emp.info?.name || emp.login || emp._id,
                    })
                  }
                  disabled={removeMutation.isPending}
                  aria-label={`Remove ${emp.info?.name || emp.login}`}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={handleConfirmRemove}
        title="Remove member?"
        confirmText="Remove"
        type="danger"
        confirmButtonProps={{ variant: 'destructive', loading: removeMutation.isPending }}
      >
        {removeTarget && (
          <p className="text-sm text-gray-600">
            Remove <strong>{removeTarget.name}</strong> from this office?
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
