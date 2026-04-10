import DebouceInput from '@/components/shared/DebouceInput';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import Dropdown from '@/components/ui/Dropdown';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { ColumnDef } from '@tanstack/react-table';
import { ReclamationType } from './ReclamationsDashboard';
// import { Role } from "@/configs/navigation.config/auth.route.config";
import { getColumnDisplayLabel, getColumnKey } from '@/services/hooks/useReclamation';
// import { useState } from "react";

type TReclameOptions = {
  columns: ColumnDef<ReclamationType>[];
  setColumnVisibleState: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  columnVisibility: Record<string, boolean>;
};
const ReclameOptions = ({ columns, setColumnVisibleState, columnVisibility }: TReclameOptions) => {
  const handleColumnVisibilityChange = (columnKey: string, isVisible: boolean) => {
    setColumnVisibleState((prev) => ({ ...prev, [columnKey]: isVisible }));
  };

  return (
    <div className="my-4 flex items-center gap-2">
      <DebouceInput
        prefix={<ApolloIcon name="search" className="text-md" />}
        placeholder="Search Reclamation ..."
        onChange={() => {
          // Handle search functionality here
        }}
        className=""
        wait={750}
      />
      <Dropdown
        renderTitle={
          <Button icon={<ApolloIcon name="eye-slash" className="text-lg" />}>
            Visible Columns
          </Button>
        }
      >
        {columns
          ?.filter((col) => {
            const key = getColumnKey(col);
            return key && !['checkbox', 'action']?.includes(key);
          })
          ?.map((col) => {
            const key = getColumnKey(col)!;
            const label = getColumnDisplayLabel(col);
            return (
              <Dropdown.Item key={key} variant="custom">
                <div className="flex items-center px-2 py-1" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={!!columnVisibility[key]}
                    onChange={(isChecked) => handleColumnVisibilityChange(key, isChecked)}
                    className="mr-2"
                    name={key}
                  />
                  <label htmlFor={key} className="grow cursor-pointer">
                    {label}
                  </label>
                </div>
              </Dropdown.Item>
            );
          })}
      </Dropdown>

      {/* <RoleGuard role={Role.ADMIN || Role.PROVIDER}>
                <Button
                    variant="solid"
                    // onClick={handleAssignLeads}
                    // disabled={!selectedLeads.length}
                    icon={<ApolloIcon name="user-plus" className="text-lg" />}
                >
                    Assign
                </Button>
                <Button
                    variant="destructive"
                    // onClick={() => setDeleteConfirmDialogOpen(true)}
                    // disabled={!selectedLeads.length}
                    icon={<ApolloIcon name="trash" className="text-lg" />}
                >
                    Delete
                </Button>
            </RoleGuard> */}
    </div>
  );
};
export default ReclameOptions;
