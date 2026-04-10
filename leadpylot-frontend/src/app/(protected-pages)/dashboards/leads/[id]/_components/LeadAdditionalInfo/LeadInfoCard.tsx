import Card from '@/components/ui/Card';
import ApolloIcon from '@/components/ui/ApolloIcon';
import InlineEditField from '@/components/shared/InlineEditField';
import Tooltip from '@/components/ui/Tooltip';

const PROJECT_DOUBLE_TAP_TOOLTIP =
  'Project: double-click or double-tap the project name to open the picker and move this lead to another project (choices may be limited to projects your assigned agent can use).';

const AGENT_DOUBLE_TAP_TOOLTIP =
  'Agent: double-click or double-tap the agent name to open the picker and assign someone else from the current project’s team.';

import { DateFormatType, dateFormateUtils } from '@/utils/dateFormateUtils';
import { getProjectColor } from '@/utils/projectColors';
import AgentDoubleTapCell from '@/components/shared/AgentDoubleTapCell';

import ProjectDoubleTapCell from '@/components/ProjectDoubleTapCell';
import classNames from '@/utils/classNames';
import LeadTimeFrameCard from '../LeadTimeFrameCard';
import LeadStatusButtonAction from '../../../_components/v2/LeadStatusButtonAction';

interface LeadInfoCardProps {
  lead: any;
  onExpectedRevenueUpdate?: (newValue: string) => Promise<void>;
  hideUpdateInfo?: boolean;
  allProjects: any;
  negativeAndPrivatOptions?: any;
  todos?: any;
  className?: string;
  showPartnerID?: boolean;
}

const LeadInfoCard = ({
  lead,
  onExpectedRevenueUpdate,
  hideUpdateInfo = false,
  allProjects,
  className = '',
  showPartnerID = false,
}: LeadInfoCardProps) => {
  const projectName = lead?.project?.name || lead?.project?.[0]?.name || lead?.source_project?.name;
  const projectColor = getProjectColor(projectName);

  const infoItems = [
    {
      icon: 'company-cog',
      label: 'Project',
      value: (
        <Tooltip
          title={PROJECT_DOUBLE_TAP_TOOLTIP}
          placement="top"
          wrapperClass="inline-flex max-w-full justify-end"
          className="max-w-sm! text-xs leading-snug"
        >
          <span
            className="flex max-h-10 w-40 items-center justify-end whitespace-nowrap"
            style={{ color: projectColor }}
          >
            <ProjectDoubleTapCell
              props={{ row: { original: lead } }}
              lead={lead}
              allProjects={allProjects}
              selectOptionClassName="min-w-fit"
              selectClassName="w-fit"
            />
          </span>
        </Tooltip>
      ),
      isEditable: false,
    },

    // {
    //   icon: 'dollar',
    //   label: 'Expected Revenue',
    //   value: lead?.expected_revenue || 'N/A',
    //   isEditable: true,
    // },

    {
      icon: 'user',
      label: 'Agent',
      value: (
        <Tooltip
          title={AGENT_DOUBLE_TAP_TOOLTIP}
          placement="top"
          wrapperClass="inline-flex max-w-full justify-end"
          className="max-w-sm! text-xs leading-snug"
        >
          <div className="flex max-h-10 w-32 items-center justify-end whitespace-nowrap">
            <AgentDoubleTapCell
              props={{ row: { original: lead } }}
              lead={lead}
              allProjects={allProjects}
              selectOptionClassName="120px"
              selectClassName="w-fit text-sm"
            />
          </div>
        </Tooltip>
      ),
    },
    ...(hideUpdateInfo
      ? []
      : [
          {
            icon: 'pen',
            label: 'Assigned',
            value: dateFormateUtils(lead?.assignedAt, DateFormatType.SHOW_DATE) || 'N/A',
          },
        ]),
  ];

  return (
    <Card
      className={classNames('h-full flex-1', className)}
      bodyClass="rounded-lg  overflow-hidden  justify-start"
    >
      <div className="flex items-center justify-between">
        <h6 className="font-semibold text-black">Lead Information</h6>
        <p className="text-sm text-black">
          {dateFormateUtils(lead?.lead_date, DateFormatType.SHOW_DATE)}
        </p>

        {/* Status dropdown moved to StatusActionsSimplified component
        <CellInlineEdit
          props={{ row: { original: lead } }}
          type="status"
          apiUpdateField="status_id"
          dropdown={true}
          options={negativeAndPrivatOptions}
          initialValue={lead?.status?.name}
          leadId={lead?._id}
          selectOptionClassName="min-w-fit"
          selectClassName="max-w-fit"
          invalidateQueries={['lead', `${lead?._id}`]}
        />
        */}
      </div>
      <div className="">
        {infoItems?.length > 0 &&
          infoItems?.map((item, index) => (
            <div key={index} className="flex h-[24px] items-center justify-between">
              <div className="flex items-center justify-start gap-2 text-black">
                <ApolloIcon name={item?.icon as any} className="text-sm text-black" />
                <span className="text-sm font-medium text-black">{item?.label}</span>
              </div>
              <div className="flex min-w-20 items-center justify-end text-end text-xs text-black md:text-sm">
                {item?.isEditable && onExpectedRevenueUpdate ? (
                  <InlineEditField
                    value={String(item?.value)}
                    onSave={onExpectedRevenueUpdate}
                    type="text"
                    className="max-w-32"
                    placeholder="Enter expected revenue (e.g., 6.78k)"
                    textClassName="max-w-32"
                  />
                ) : (
                  item?.value
                )}
              </div>
            </div>
          ))}

        <LeadTimeFrameCard lead={lead} showPartnerID={showPartnerID} />
        <LeadStatusButtonAction lead={lead} />
      </div>
    </Card>
  );
};

export default LeadInfoCard;
