'use client';
import AgentBatch from '@/app/(protected-pages)/dashboards/leads/_components/AgentBatch';
import { AssignmentCell } from './AssignmentDoubleClickModal';
import CellInlineEdit from './CellInlineEdit';

const AgentDoubleTapCell = ({
  props,
  lead,
  allProjects,
  selectOptionClassName = 'min-w-28',
  selectClassName,
}: any) => {
  const agentName = lead?.project?.[0]?.agent?.login;
  const agentColor = lead?.project?.[0]?.agent?.color_code;
  const projectId = lead?.project?.[0]?._id;

  const agentOptions = allProjects?.data
    ?.filter((project: any) => project?._id === projectId)
    ?.map((project: any) =>
      project?.agents?.map((agent: any) => ({
        value: agent?.user?._id,
        label: agent?.user?.name,
      }))
    );

  if (agentName) {
    return (
      <CellInlineEdit
        props={props}
        type="agent"
        apiUpdateField="agent_id"
        dropdown={true}
        options={agentOptions?.[0]}
        initialValue={agentName}
        leadId={props.row.original?._id}
        selectOptionClassName={selectOptionClassName}
        selectClassName={selectClassName}
        agentColor={agentColor}
      />
    );
  }

  return (
    <AssignmentCell lead={lead}>
      <AgentBatch agentName={agentName} agentColor={agentColor} />
    </AssignmentCell>
  );
};

export default AgentDoubleTapCell;
