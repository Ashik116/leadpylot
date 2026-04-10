'use client';
import CellInlineEdit from '@/components/shared/CellInlineEdit';
import useDoubleTapDataUpdateChanges from '@/hooks/useDoubleTapDataUpdateChanges';
import { TLead } from '@/services/LeadsService';

const LeadStatusButtonAction = ({ lead }: { lead: TLead }) => {
  const { allStatus } = useDoubleTapDataUpdateChanges({
    stagesApi: true,
  });

  return (
    <div className="mt-1 flex items-center justify-between gap-2">
      <span className="text-sm font-medium text-black">Current</span>
      <CellInlineEdit
        props={{ row: { original: lead } }}
        type="status"
        apiUpdateField="status_id"
        dropdown={true}
        options={allStatus}
        initialValue={lead?.status?.name}
        leadId={lead?._id}
        selectOptionClassName="min-w-fit"
        selectClassName="max-w-fit"
        invalidateQueries={['lead', `${lead?._id}`]}
      />
    </div>
  );
};

export default LeadStatusButtonAction;
