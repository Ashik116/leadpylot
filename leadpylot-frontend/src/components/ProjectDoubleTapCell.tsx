'use client';
import { AssignmentCell } from './shared/AssignmentDoubleClickModal';
import CellInlineEdit from './shared/CellInlineEdit';

const ProjectDoubleTapCell = ({
  props,
  lead,
  allProjects,
  selectOptionClassName,
  selectClassName,
}: any) => {
    
  // Count how many projects the agent is assigned to
  const agentId = lead?.project?.[0]?.agent?._id;

  const projectName = lead?.project?.name || lead?.project_id?.name || lead?.project?.[0]?.name;
  const projectColor =
    lead?.project?.color_code || lead?.project_id?.color_code || lead?.project?.[0]?.color_code;
  // Only show projects that the agent is assigned to
  const projectOptions = agentId
    ? allProjects?.data
        .filter((project: any) =>
          project?.agents?.some(
            (agent: any) => agent?.user?._id === agentId || agent?.user_id?.toString() === agentId
          )
        )
        .map((project: any) => ({
          value: project._id,
          label: project.name,
          color_code: project.color_code,
        }))
    : allProjects?.data.map((project: any) => ({
        value: project._id,
        label: project.name,
        color_code: project.color_code,
      }));



  if (projectName) {
    return (
      <CellInlineEdit
        props={props}
        type="project"
        apiUpdateField="project_id"
        dropdown={true}
        options={projectOptions}
        initialValue={projectName}
        leadId={props.row.original?._id}
        selectOptionClassName={selectOptionClassName}
        selectClassName={selectClassName}
        agentColor={projectColor}
      />
    );
  }

  return (
    <AssignmentCell lead={lead}>
      <span className="text-sm font-medium whitespace-nowrap">{projectName ?? '-'}</span>
    </AssignmentCell>
  );
};

export default ProjectDoubleTapCell;
