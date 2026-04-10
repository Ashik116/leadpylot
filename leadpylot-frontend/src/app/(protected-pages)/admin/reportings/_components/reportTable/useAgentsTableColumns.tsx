import { ColumnDef } from '@/components/shared/DataTable';
import { AGENT_COLORS } from '@/utils/utils';
import { MetricGroupConfig } from './reportingUtils';

export const METRIC_GROUPS: MetricGroupConfig[] = [
  { label: 'LEADS', key: 'leads', headerColor: 'bg-blue-200', bgColor: 'bg-blue-50', liveAccessor: 'metrics.total_leads_live', recycleAccessor: 'metrics.total_leads_recycle', metricType: 'count' },
  { label: 'U-N2', key: 'u_n2', headerColor: 'bg-indigo-200', bgColor: 'bg-indigo-50', liveAccessor: 'metrics.u_n2_live', recycleAccessor: 'metrics.u_n2_recycle', metricType: 'percentage' },
  { label: 'Reklamation', key: 'reklamation', headerColor: 'bg-red-200', bgColor: 'bg-red-50', liveAccessor: 'metrics.reklamation_live', recycleAccessor: 'metrics.reklamation_recycle', metricType: 'count' },
  { label: 'Angebots', key: 'angebots', headerColor: 'bg-purple-200', bgColor: 'bg-purple-50', liveAccessor: 'metrics.total_offers_live', recycleAccessor: 'metrics.total_offers_recycle', metricType: 'count' },
  { label: 'OPENINGS', key: 'opening', headerColor: 'bg-teal-200', bgColor: 'bg-teal-50', liveAccessor: 'metrics.total_openings_live', recycleAccessor: 'metrics.total_openings_recycle', metricType: 'count' },
  { label: 'ANNAHMEN', key: 'annahmen', headerColor: 'bg-emerald-200', bgColor: 'bg-emerald-50', liveAccessor: 'metrics.total_confirmation_live', recycleAccessor: 'metrics.total_confirmation_recycle', metricType: 'count' },
  { label: 'Ü-TRÄGER', key: 'u_trager', headerColor: 'bg-orange-200', bgColor: 'bg-orange-50', liveAccessor: 'metrics.u_trager_live', recycleAccessor: 'metrics.u_trager_recycle', metricType: 'count' },
  { label: 'NETTO 1', key: 'netto1', headerColor: 'bg-green-200', bgColor: 'bg-green-50', liveAccessor: 'metrics.total_netto1_live', recycleAccessor: 'metrics.total_netto1_recycle', metricType: 'count' },
  { label: 'NETTO 2', key: 'netto2', headerColor: 'bg-lime-200', bgColor: 'bg-lime-50', liveAccessor: 'metrics.netto2_live', recycleAccessor: 'metrics.netto2_recycle', metricType: 'count' },
];
// Helper function to get background color from Tailwind class
const getBackgroundColorFromClass = (className: string): string => {
  const colorMap: Record<string, string> = {
    'bg-blue-50': '#eff6ff',
    'bg-indigo-50': '#eef2ff',
    'bg-red-50': '#fef2f2',
    'bg-purple-50': '#faf5ff',
    'bg-teal-50': '#f0fdfa',
    'bg-emerald-50': '#ecfdf5',
    'bg-orange-50': '#fff7ed',
    'bg-green-50': '#f0fdf4',
    'bg-lime-50': '#f7fee7',
  };
  return colorMap[className] || '';
};
interface FooterTotals {
  [key: string]: number | undefined;
  leads_live?: number;
  leads_recycle?: number;
  u_n2_live?: number;
  u_n2_recycle?: number;
  reklamation_live?: number;
  reklamation_recycle?: number;
  offers_live?: number;
  offers_recycle?: number;
  openings_live?: number;
  openings_recycle?: number;
  confirmation_live?: number;
  confirmation_recycle?: number;
  u_trager_live?: number;
  u_trager_recycle?: number;
  netto1_live?: number;
  netto1_recycle?: number;
  netto2_live?: number;
  netto2_recycle?: number;
}

interface UseAgentsTableColumnsProps {
  footerTotals: FooterTotals | null;
  primaryGrouping?: string;
  secondaryGrouping?: string;
  tertiaryGrouping?: string;
  leadType?: 'all' | 'live' | 'recycle';
  onCellClick?: (params: { type: 'agent' | 'project'; id: string; name: string; rowData?: any }) => void;
}

// Footer value mapping
const FOOTER_KEY_MAP: Record<string, { live: string; recycle: string }> = {
  leads: { live: 'leads_live', recycle: 'leads_recycle' },
  u_n2: { live: 'u_n2_live', recycle: 'u_n2_recycle' },
  reklamation: { live: 'reklamation_live', recycle: 'reklamation_recycle' },
  angebots: { live: 'offers_live', recycle: 'offers_recycle' },
  opening: { live: 'openings_live', recycle: 'openings_recycle' },
  annahmen: { live: 'confirmation_live', recycle: 'confirmation_recycle' },
  u_trager: { live: 'u_trager_live', recycle: 'u_trager_recycle' },
  netto1: { live: 'netto1_live', recycle: 'netto1_recycle' },
  netto2: { live: 'netto2_live', recycle: 'netto2_recycle' },
};

// Header name mapping
const HEADER_NAMES: Record<string, string> = {
  agent: 'AGENT',
  project: 'PROJECT',
  status: 'STATUS',
  source: 'SOURCE',
  stage: 'STAGE',
};

// Helper functions
const getHeaderName = (grouping: string) => HEADER_NAMES[grouping] || 'GROUP';

const getAgentColor = (name: string): string => {
  if (!name || typeof name !== 'string') return 'text-gray-600';
  const trimmed = name.trim().toUpperCase();
  const key = trimmed.length <= 2 ? trimmed : trimmed.slice(0, 2) + trimmed.slice(-1);
  const colorKeys = Object.keys(AGENT_COLORS);
  const hash = key.split('').reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0);
  return AGENT_COLORS[colorKeys[Math.abs(hash) % colorKeys.length]] || 'text-gray-500';
};

const getCellColor = (value: number, key: string, bgColor: string): string => {
  if ((key === 'u_n2' || key === 'reklamation') && value > 10) return 'bg-red-100';
  if ((key === 'u_n2' || key === 'reklamation') && value > 5) return 'bg-orange-100';
  return bgColor;
};

const getValue = (row: any, accessor: string): number => {
  return accessor.split('.').reduce((obj, key) => obj?.[key], row.original) || 0;
};

const formatValue = (value: number, type?: string): string => {
  return type === 'percentage' ? `${value.toFixed(2)}%` : value.toLocaleString();
};



// Create metric cell column
const createMetricCell = (
  accessor: string,
  isLive: boolean,
  config: MetricGroupConfig,
  footerValue: number,
  leadType: 'all' | 'live' | 'recycle'
): ColumnDef<any> => ({
  accessorKey: accessor,
  enableResizing: true,
  maxSize: 100,
  minSize: 100,
  // size: 100,
  enableSorting: true,
  meta: {
    style: {
      backgroundColor: getBackgroundColorFromClass(config.bgColor),
    },
    headerAlign: 'center' as const,
  },
  header: isLive ? 'Live' : 'Recycle',
  footer: () => (
    <div className={`text-center ${config.bgColor} py-1`}>{formatValue(footerValue, config.metricType)}</div>
  ),
  cell: ({ row }) => {
    const value = getValue(row, accessor);
    return (
      <div className={`text-center ${getCellColor(value, config.key, config.bgColor)} truncate p-1 font-semibold opacity-80`}>
        {formatValue(value, config.metricType)}
      </div>
    );
  },
});

// Create grouped metric column
const createMetricColumn = (config: MetricGroupConfig, footerTotals: FooterTotals | null, leadType: 'all' | 'live' | 'recycle'): ColumnDef<any> => {
  const footerMap = FOOTER_KEY_MAP[config.key];
  const getFooter = (isLive: boolean) => footerTotals?.[isLive ? footerMap.live : footerMap.recycle] || 0;

  const childColumns: ColumnDef<any>[] = [];
  if (leadType === 'all' || leadType === 'live') {
    childColumns.push(createMetricCell(config.liveAccessor, true, config, getFooter(true), leadType));
  }
  if (leadType === 'all' || leadType === 'recycle') {
    childColumns.push(createMetricCell(config.recycleAccessor, false, config, getFooter(false), leadType));
  }

  return {
    id: config.key,
    enableResizing: true,
    maxSize: 200,
    minSize: 10,
    header: () => (
      <div className={`${config.headerColor} flex justify-center items-center truncate`}>
        {config.label}
      </div>
    ),
    columns: childColumns,
  };
};

// Create rowspan cell
const createRowspanCell = (
  name: string,
  rowSpan: number,
  isFirst: boolean,
  id?: string,
  type?: 'agent' | 'project',
  onCellClick?: (params: { type: 'agent' | 'project'; id: string; name: string; rowData?: any }) => void,
  rowData?: any
) => {
  if (!isFirst) return <span data-skip-cell="true" className="hidden">skip</span>;

  const isClickable = id && type && onCellClick;
  const handleClick = () => isClickable && onCellClick({ type, id, name, rowData });

  return (
    <div
      className={`h-full truncate ${getAgentColor(name)} ${isClickable ? 'cursor-pointer' : ''}`}
      data-rowspan={rowSpan}
      onClick={isClickable ? handleClick : undefined}
    >{name}
    </div>
  );
};

export const useAgentsTableColumns = ({
  footerTotals,
  primaryGrouping = 'agent',
  secondaryGrouping,
  tertiaryGrouping,
  leadType = 'all',
  onCellClick,
}: UseAgentsTableColumnsProps): ColumnDef<any>[] => {
  const baseColumns: ColumnDef<any>[] = [];
  const primaryHeader = getHeaderName(primaryGrouping);

  // Helper function to get accessor key based on grouping type
  const getAccessorKey = (grouping: string): string => {
    if (grouping === 'agent') return 'agentname';
    if (grouping === 'project') return 'projectname';
    return 'display_name'; // fallback for status, stage, etc.
  };

  // Primary column
  if (secondaryGrouping) {
    baseColumns.push({
      accessorKey: getAccessorKey(primaryGrouping),
      header: primaryHeader as string,
      enableSorting: true,
      enableResizing: true,
      maxSize: 200,
      minSize: 10,
      // footer: () => <div className="justify-end flex items-center  text-gray-900 uppercase">Summary</div>
      cell: ({ row }) => {
        const primaryId = row.original?._primaryId;
        const primaryType = row.original?._primaryType as 'agent' | 'project' | undefined;
        const isClickable = primaryId && (primaryType === 'agent' || primaryType === 'project');

        return createRowspanCell(
          row.original?.display_name || '-',
          row.original?.primaryRowSpan || 1,
          row.original?.isFirstRowOfGroup,
          isClickable ? primaryId : undefined,
          isClickable ? primaryType : undefined,
          onCellClick,
          row.original
        );
      },
    });

    // Secondary column
    if (tertiaryGrouping) {
      baseColumns.push({
        accessorKey: getAccessorKey(secondaryGrouping),
        header: getHeaderName(secondaryGrouping) as string,
        enableSorting: true,
        enableResizing: true,
        maxSize: 150,
        minSize: 10,
        cell: ({ row }) => {
          const secondaryId = row.original?._secondaryId;
          const secondaryType = row.original?._secondaryType as 'agent' | 'project' | undefined;
          const isClickable = secondaryId && (secondaryType === 'agent' || secondaryType === 'project');

          return createRowspanCell(
            row.original?.secondary_name || '-',
            row.original?.secondaryRowSpan || 1,
            row.original?.isFirstSecondaryRow,
            isClickable ? secondaryId : undefined,
            isClickable ? secondaryType : undefined,
            onCellClick,
            row.original
          );
        },
        meta: { style: { position: 'relative', padding: 0 } },
      });

      baseColumns.push({
        accessorKey: getAccessorKey(tertiaryGrouping),
        header: getHeaderName(tertiaryGrouping) as string,
        enableSorting: true,
        enableResizing: true,
        maxSize: 150,
        minSize: 10,
        cell: ({ row }) => (
          <div className="px-3 text-start">
            <div>{row.original?.tertiary_name || '-'}</div>
          </div>
        ),
      });
    } else {
      baseColumns.push({
        accessorKey: getAccessorKey(secondaryGrouping),
        header: getHeaderName(secondaryGrouping) as string,
        enableSorting: true,
        enableResizing: true,
        maxSize: 150,
        minSize: 10,
        cell: ({ row }) => {
          const secondaryId = row.original?._secondaryId;
          const secondaryType = row.original?._secondaryType as 'agent' | 'project' | undefined;
          const isClickable = secondaryId && (secondaryType === 'agent' || secondaryType === 'project');
          const name = row.original?.project || '-';

          const handleClick = () => {
            if (isClickable && onCellClick) {
              onCellClick({ type: secondaryType!, id: secondaryId!, name, rowData: row.original });
            }
          };

          return (
            <div
              className={`truncate ${getAgentColor(name)} ${isClickable ? 'cursor-pointer ' : ''}`}
              onClick={isClickable ? handleClick : undefined}
            >
              {name}
            </div>
          );
        },
      });
    }
  } else {
    baseColumns.push({
      accessorKey: getAccessorKey(primaryGrouping),
      header: primaryHeader as string,
      enableSorting: true,
      enableResizing: true,
      maxSize: 200,
      minSize: 10,
      footer: () => <div className="justify-left flex items-center text-xl font-bold text-gray-900 capitalize">Summary</div>,
      cell: ({ row }) => {
        const primaryId = row.original?._primaryId;
        const primaryType = row.original?._primaryType as 'agent' | 'project' | undefined;
        const isClickable = primaryId && (primaryType === 'agent' || primaryType === 'project');
        const name = row.original?.display_name || '-';

        const handleClick = () => {
          if (isClickable && onCellClick) {
            onCellClick({ type: primaryType!, id: primaryId!, name, rowData: row.original });
          }
        };

        return (
          <div
            className={`h-full truncate ${getAgentColor(name)} ${isClickable ? 'cursor-pointer' : ''}`}
            onClick={isClickable ? handleClick : undefined}
          >
            {name}
          </div>
        );
      },
    });
  }

  // Metric columns
  const metricColumns = METRIC_GROUPS.map((config) => createMetricColumn(config, footerTotals, leadType));

  return [...baseColumns, ...metricColumns];
};
