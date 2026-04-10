import { useMemo, useCallback } from 'react';
import { useSession } from '@/hooks/useSession';
import { ColumnDef } from '@/components/shared/DataTable';
import { Role } from '@/configs/navigation.config/auth.route.config';

interface UseRoleBasedColumnsProps {
  columns: ColumnDef<any, any>[];
}

/**
 * Hook to filter columns based on user role and usage context
 * Handles restrictions for different user roles (e.g., Agent restrictions)
 */
export const useRoleBasedColumns = ({ columns }: UseRoleBasedColumnsProps) => {
  const { data: session } = useSession();
  const isAgent = session?.user?.role === Role.AGENT;

  const getFilteredColumns = useCallback(
    (sharedDataTable: boolean = false) => {
      let result = [...columns];

      // NOTE: Role-based column restrictions are now handled via the admin 
      // per-user column settings. The admin can configure which columns 
      // each user/role can see through the Table Settings page.
      // The previous hardcoded restrictions for Agents have been removed
      // to allow flexible per-user configuration.

      // Hide checkbox column when used as shared DataTable
      if (sharedDataTable) {
        result = result.filter((col) => col.id !== 'checkbox');
      }

      return result;
    },
    [columns]
  );

  // Default filtered columns (without sharedDataTable restrictions)
  const filteredColumns = useMemo(() => getFilteredColumns(false), [getFilteredColumns]);

  return {
    filteredColumns,
    getFilteredColumns,
    isAgent,
    userRole: session?.user?.role,
  };
};
