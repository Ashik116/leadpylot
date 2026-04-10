import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import useColumns from './useColumns';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import { useGetOffers } from '@/services/OfferService';

const OfferTable = () => {
  const { data, isLoading } = useGetOffers();
  const colums = useColumns();
  const tableConfig = useBaseTable({
    tableName: 'Offers_table',
    data: data?.data,

    loading: isLoading,
    totalItems: data?.meta.total,

    columns: colums,
    returnFullObjects: true,
    title: 'Offers',
    description: `Total offers: ${data?.meta.total}`,
    rowClassName: 'cursor-pointer hover:bg-gray-50',
  });
  return (
    <div>
      <BaseTable {...tableConfig} />
    </div>
  );
};

export default OfferTable;
