'use client';
import CellInlineEdit from '@/components/shared/CellInlineEdit';
import ApolloIcon from '@/components/ui/ApolloIcon';

const InlinePartnerID = ({ lead, invalidateQueries }: any) => {
  return (
    <div className="flex min-w-[152px] items-center gap-1">
      <ApolloIcon name="user" className="text-xs leading-none text-gray-600" />
      <span className="text-sm font-medium text-gray-600">Partner ID:</span>
      <CellInlineEdit
        props={{ row: { original: lead } }}
        type="lead_source_no"
        apiUpdateField="lead_source_no"
        initialValue={lead?.lead_source_no}
        leadId={lead?._id}
        invalidateQueries={invalidateQueries ?? ['lead', `${lead?._id}`]}
        isCopyable={true}
        cellInlineEditClassName=""
      />
    </div>
  );
};

export default InlinePartnerID;
