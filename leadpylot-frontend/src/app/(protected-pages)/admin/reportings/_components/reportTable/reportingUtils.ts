import { HierarchicalGroupItem } from '@/services/ReportingService';

export interface MetricGroupConfig {
  label: string;
  key: string;
  headerColor: string;
  bgColor: string;
  liveAccessor: string;
  recycleAccessor: string;
  metricType?: 'percentage' | 'currency' | 'count';
}

const extractMetrics = (item: any) => {
  return {
    total_leads_live: item.leads?.live || 0,
    total_leads_recycle: item.leads?.recycle || 0,
    total_leads: item.leads?.total_leads || 0,
    // conversion_rate maps to U-N2
    u_n2_live: item.conversion_rate?.live || 0,
    u_n2_recycle: item.conversion_rate?.recycle || 0,
    reklamation_live: item.reclamation?.live || 0,
    reklamation_recycle: item.reclamation?.recycle || 0,
    total_offers_live: item.angebots?.live || item.Angebot?.live || 0,
    total_offers_recycle: item.angebots?.recycle || item.Angebot?.recycle || 0,
    total_openings_live: item.openings?.live || 0,
    total_openings_recycle: item.openings?.recycle || 0,
    // confirmation maps to ANNAHMEN
    total_confirmation_live: item.confirmation?.live || 0,
    total_confirmation_recycle: item.confirmation?.recycle || 0,
    // payment_voucher maps to Ü-TRÄGER
    u_trager_live: item.payment_voucher?.live || 0,
    u_trager_recycle: item.payment_voucher?.recycle || 0,
    total_netto1_live: item.netto1?.live || 0,
    total_netto1_recycle: item.netto1?.recycle || 0,
    netto2_live: item.netto2?.live || 0,
    netto2_recycle: item.netto2?.recycle || 0,
  };
};

// Helper function to extract name from nested structure
const extractName = (item: any, grouping: string): string => {
  if (grouping === 'agent' && item.agent?.agentname) {
    return item.agent.agentname;
  }
  if (grouping === 'project' && item.project?.projectname) {
    return item.project.projectname;
  }
  // Fallback to old structure for backward compatibility
  const key = `${grouping}name`;
  return item[key] || item[grouping] || '-';
};

// Helper function to extract ID from nested structure
const extractId = (item: any, grouping: string): string | undefined => {
  if (grouping === 'agent' && item.agent?.agent_id) {
    return item.agent.agent_id;
  }
  if (grouping === 'project' && item.project?.project_id) {
    return item.project.project_id;
  }
  return undefined;
};

export const transformHierarchicalData = (data: HierarchicalGroupItem[], primary: string, secondary?: string, tertiary?: string): any[] => {
  if (!data || data.length === 0) return [];

  const flattenedData: any[] = [];

  data.forEach((primaryItem) => {
    const primaryName = extractName(primaryItem, primary);
    const primaryId = extractId(primaryItem, primary);
    const primaryType = primary;
    const secondaryKey = secondary ? `${secondary}name` : null;
    const tertiaryKey = tertiary ? `${tertiary}name` : null;

    // Get nested array based on secondary grouping
    const secondaryArray = secondaryKey ? primaryItem[secondaryKey] : null;

    if (tertiary && tertiaryKey && secondary && secondaryArray && Array.isArray(secondaryArray)) {
      // Three-level hierarchy: primary -> secondary -> tertiary
      const secondaryItems = secondaryArray as HierarchicalGroupItem[];
      let totalRowCount = 0;

      // First pass: count total rows for primary rowspan
      secondaryItems.forEach((secondaryItem) => {
        const tertiaryArray = secondaryItem[tertiaryKey];
        if (Array.isArray(tertiaryArray)) {
          totalRowCount += tertiaryArray.length;
        } else {
          totalRowCount += 1;
        }
      });

      let primaryRowIndex = 0;

      secondaryItems.forEach((secondaryItem) => {
        const secondaryName = extractName(secondaryItem, secondary);
        const secondaryId = extractId(secondaryItem, secondary);
        const secondaryType = secondary;
        const tertiaryArray = secondaryItem[tertiaryKey];

        if (Array.isArray(tertiaryArray)) {
          const tertiaryItems = tertiaryArray as HierarchicalGroupItem[];
          const secondaryRowSpan = tertiaryItems.length;

          tertiaryItems.forEach((tertiaryItem, tertIdx) => {
            const tertiaryName = extractName(tertiaryItem, tertiary);
            const tertiaryId = extractId(tertiaryItem, tertiary);
            const tertiaryType = tertiary;
            flattenedData.push({
              display_name: primaryName,
              _primaryId: primaryId,
              _primaryType: primaryType,
              secondary_name: secondaryName,
              _secondaryId: secondaryId,
              _secondaryType: secondaryType,
              tertiary_name: tertiaryName,
              _tertiaryId: tertiaryId,
              _tertiaryType: tertiaryType,
              isFirstRowOfGroup: primaryRowIndex === 0,
              primaryRowSpan: totalRowCount,
              isFirstSecondaryRow: tertIdx === 0,
              secondaryRowSpan: secondaryRowSpan,
              metrics: extractMetrics(tertiaryItem),
            });
            primaryRowIndex++;
          });
        } else {
          flattenedData.push({
            display_name: primaryName,
            _primaryId: primaryId,
            _primaryType: primaryType,
            secondary_name: secondaryName,
            _secondaryId: secondaryId,
            _secondaryType: secondaryType,
            tertiary_name: '-',
            isFirstRowOfGroup: primaryRowIndex === 0,
            primaryRowSpan: totalRowCount,
            isFirstSecondaryRow: true,
            secondaryRowSpan: 1,
            metrics: extractMetrics(secondaryItem),
          });
          primaryRowIndex++;
        }
      });
    } else if (secondary && secondaryArray && Array.isArray(secondaryArray)) {
      // Two-level hierarchy: primary -> secondary
      const secondaryItems = secondaryArray as HierarchicalGroupItem[];
      const rowSpan = secondaryItems.length;

      secondaryItems.forEach((secondaryItem, index) => {
        const secondaryName = extractName(secondaryItem, secondary);
        const secondaryId = extractId(secondaryItem, secondary);
        const secondaryType = secondary;
        flattenedData.push({
          display_name: primaryName,
          _primaryId: primaryId,
          _primaryType: primaryType,
          project: secondaryName,
          _secondaryId: secondaryId,
          _secondaryType: secondaryType,
          isFirstRowOfGroup: index === 0,
          primaryRowSpan: rowSpan,
          metrics: extractMetrics(secondaryItem),
        });
      });
    } else {
      // Single-level: just primary
      flattenedData.push({
        display_name: primaryName,
        _primaryId: primaryId,
        _primaryType: primaryType,
        project: '-',
        isFirstRowOfGroup: true,
        primaryRowSpan: 1,
        metrics: extractMetrics(primaryItem),
      });
    }
  });

  return flattenedData;
};
