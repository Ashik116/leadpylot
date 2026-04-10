import React, { useMemo, useState } from 'react';
import { Row } from '@/components/shared/DataTable';
import { Lead } from '@/services/LeadsService';
import CommonLeadsDashboard from '../../_components/CommonLeadsDashboard';
import { isDev } from '@/utils/utils';
import { useDynamicFiltersStore } from '@/stores/dynamicFiltersStore';

interface ProjectLead {
  lead: {
    _id: string;
    contact_name: string;
    email_from: string;
    phone?: string;
    expected_revenue: number;
    [key: string]: any;
  };
  assignment: {
    agent: {
      _id: string;
      login: string;
      role: string;
    };
    assignedAt: string;
    assignedBy: string;
    notes: string;
  };
}

interface ProjectTableData {
  _id: string;
  projectName: string;
  totalOffers: number;
  totalAgents: number;
  totalLeads: number;
  leads: ProjectLead[];
}

interface ExpandedRowProjectDetailsProps {
  row: Row<ProjectTableData>;
  expandedRowId: string;
}

const ExpandedRowProjectDetails: React.FC<ExpandedRowProjectDetailsProps> = ({
  row,
  expandedRowId,
}) => {
  // Add state for pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Get dynamic filters store to check if dynamic filters are active
  const { isDynamicFilterMode } = useDynamicFiltersStore();

  // Transform project leads data to match the Lead interface expected by CommonLeadsDashboard
  const transformedLeads = useMemo((): Lead[] => {
    try {
      if (expandedRowId !== row?.original?._id) {
        return [];
      }

      const leads = row.original?.leads || [];

      return leads.map((projectLead, index) => ({
        _id: projectLead?.lead?._id,
        id: index + 1, // Generate a numeric ID
        use_status: 'active',
        usable: 'yes',
        duplicate_status: 'new',
        checked: false,
        lead_source_no: projectLead?.lead?.lead_source_no || 'N/A',
        system_id: null,
        contact_name: projectLead?.lead?.contact_name || 'N/A',
        email_from: projectLead?.lead?.email_from || 'N/A',
        phone: projectLead?.lead?.phone || 'N/A',
        expected_revenue: projectLead?.lead?.expected_revenue || 0,
        lead_date: projectLead?.lead?.lead_date || new Date().toISOString(),
        assigned_date: projectLead?.assignment?.assignedAt || new Date().toISOString(),
        source_month: null,
        prev_month: null,
        current_month: null,
        source_team_id: null,
        source_user_id: null,
        prev_team_id: null,
        prev_user_id: null,
        team_id: null,
        user_id: projectLead?.assignment?.agent?._id || null,
        instance_id: null,
        source_id: 'project-lead',
        active: true,
        createdAt: projectLead?.lead?.createdAt || new Date().toISOString(),
        updatedAt: projectLead?.lead?.updatedAt || new Date().toISOString(),
        __v: 0,
        stage: {
          id: 'active',
          name: 'Active',
          isWonStage: false,
        },
        status: {
          id: 'assigned',
          name: 'Assigned',
          code: 'ASSIGNED',
        },
        assigned_agent: {
          _id: projectLead?.assignment?.agent?._id || '',
          login: projectLead?.assignment?.agent?.login || 'N/A',
          role: projectLead?.assignment?.agent?.role || 'Agent',
          active: true,
          instance_status: 'active',
          instance_userid: null,
          anydesk: null,
          user_id: projectLead?.assignment?.agent?._id || '',
        },
        project: {
          _id: row?.original?._id,
          name: row?.original?.projectName,
        },
        notes: projectLead?.assignment?.notes || '',
      }));
    } catch (error) {
      isDev && console.error('Error transforming leads:', error);
      return [];
    }
  }, [row?.original, expandedRowId]);

  if (expandedRowId !== row?.original?._id) {
    return null;
  }

  // Only pass data to CommonLeadsDashboard if dynamic filters are not active
  // This allows the dynamic filter results to be displayed properly
  const shouldPassData = !isDynamicFilterMode;

  return (
    <div className="relative my-2 rounded-lg">
      <div className="m-4">
        <h3 className="text-lg font-semibold text-gray-800">{row?.original?.projectName}</h3>
        <p className="text-sm text-gray-600">Total Leads: {transformedLeads?.length}</p>
      </div>

      {transformedLeads?.length > 0 ? (
        <CommonLeadsDashboard
          data={shouldPassData ? transformedLeads : undefined}
          loading={shouldPassData ? false : undefined}
          total={shouldPassData ? transformedLeads?.length : undefined}
          page={page}
          pageSize={pageSize}
          onPaginationChange={setPage}
          onPageSizeChange={setPageSize}
          pageTitle="Project Leads"
          tableName={`project-${row?.original?._id}-leads`}
          projectNameFromDetailsPage={row?.original?.projectName}
          sharedDataTable={true}
        />
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <div className="text-gray-500">
            <p className="text-lg font-medium">No leads found</p>
            <p className="text-sm">This project doesn&apos;t have any leads assigned yet.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpandedRowProjectDetails;
