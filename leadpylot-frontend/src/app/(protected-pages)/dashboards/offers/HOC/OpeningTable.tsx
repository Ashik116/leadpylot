import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import useColumns from './useColumns';

import BaseTable from '@/components/shared/BaseTable/BaseTable';
// import { useGetOpenings } from '@/services/OfferService';
import { useOpenings } from '@/services/hooks/useOpenings';

const OpeningTable = () => {
  const { data, isLoading } = useOpenings();
  const colums = useColumns();
  const tableConfig = useBaseTable({
    tableName: 'Openings_table',
    data: data?.data,

    loading: isLoading,
    totalItems: data?.meta.total,

    columns: colums,
    returnFullObjects: true,
    title: 'Openings',
    description: `Total openings: ${data?.meta.total}`,
    rowClassName: 'cursor-pointer hover:bg-gray-50',
  });
  return (
    <div>
      <BaseTable {...tableConfig} />
    </div>
  );
};

export default OpeningTable;
