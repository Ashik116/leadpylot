import Skeleton from '@/components/ui/Skeleton';
import Table from '@/components/ui/Table';
import type { SkeletonProps } from '@/components/ui/Skeleton';

type TableRowSkeletonProps = {
  columns?: number;
  rows?: number;
  avatarInColumns?: number[];
  avatarProps?: SkeletonProps;
};

const { Tr, Td } = Table;

const TableRowSkeleton = (props: TableRowSkeletonProps) => {
  const { columns = 1, rows = 10, avatarInColumns = [], avatarProps } = props;

  return (
    <>
      {Array.from(new Array(rows), (_, i) => i + 0).map((row) => (
        <Tr key={`row-${row}`}>
          {Array.from(new Array(columns), (_, i) => i + 0).map((col) => (
            <Td className="py-[3px]" key={`col-${col}`}>
              <div className="flex flex-auto items-center gap-2 py-0.5">
                {avatarInColumns.includes(col) && <Skeleton variant="circle" {...avatarProps} />}
                <Skeleton />
              </div>
            </Td>
          ))}
        </Tr>
      ))}
    </>
  );
};

export default TableRowSkeleton;
