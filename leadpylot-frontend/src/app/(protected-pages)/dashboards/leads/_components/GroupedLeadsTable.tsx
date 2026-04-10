/* 
 * ============================================================================
 * OLD COMPONENT - REPLACED BY NEW GROUPING SYSTEM
 * ============================================================================
 * This component has been replaced by:
 * @frontend/src/components/groupAndFiltering/LeadsGroupSummary.tsx
 * @frontend/src/components/shared/DataTableOptimizedVersion/DataTableOptimized.tsx
 * 
 * The new system uses:
 * - useGroupedSummary hook (GET /leads?domain=...&groupBy=...)
 * - useLeads hook (GET /leads?domain=...)
 * - useUniversalGroupingFilterStore (Zustand store)
 * - DataTableOptimized with groupedMode prop
 * 
 * DO NOT USE THIS COMPONENT - Use the new grouping system instead
 * ============================================================================
 */

 
// OLD IMPORTS - COMMENTED OUT
/*
import DataTable from '@/components/shared/DataTable';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Pagination from '@/components/ui/Pagination';
import Select from '@/components/ui/Select';
import Skeleton from '@/components/ui/Skeleton';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useFilterChainLeads } from '@/hooks/useFilterChainLeads';
import { useSession } from '@/hooks/useSession';
import { useGroupedSummary, useGroupLeads } from '@/services/hooks/useLeads';
import { GroupedLeadsGroup, GroupedLeadsSubGroup } from '@/services/LeadsService';
import { useGroupSortingStore } from '@/stores/groupSortingStore';
import { useGroupedSortingStore } from '@/stores/groupedSortingStore';
import { useFilterAwareLeadsNavigationStore } from '@/stores/navigationStores';
import { useApiUrlStore } from '@/stores/apiUrlStore';
import { useUniversalGroupingFilterStore, DomainFilter } from '@/stores/universalGroupingFilterStore';
import {
  getTableZoomContainerStyles,
  getTableZoomStyles,
  useTableZoomStore,
} from '@/stores/tableZoomStore';
import { formatGroupNameIfDate } from '@/utils/dateFormateUtils';
import {
  buildParentPathHierarchy,
  computeUniqueGroupId,
  extractGroupPathFromHierarchy,
  findPathToGroup,
  generateGroupPathWithColoredLastSegment,
} from '@/utils/groupUtils';
import { getPaginationOptions } from '@/utils/paginationNumber';
import type { ColumnSort } from '@tanstack/react-table';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import ExpandRowLeadViewDetails from './ExpandRowLeadViewDetails';
import GroupedLeadsTableSkeleton from './GroupedLeadsTableSkeleton';
*/

// OLD COMPONENT - DO NOT USE
// All component code has been commented out and replaced with a stub
// export default function GroupedLeadsTable_OLD_DO_NOT_USE() {
//   console.warn(
//     'GroupedLeadsTable_OLD_DO_NOT_USE: This component has been deprecated. Use the new grouping system with LeadsGroupSummary and DataTableOptimized instead.'
//   );
//           return null;
// }

/* 
 * ============================================================================
 * OLD COMPONENT CODE - COMMENTED OUT
 * ============================================================================
 * The entire component implementation has been moved to the new system.
 * See:
 * - @frontend/src/components/groupAndFiltering/LeadsGroupSummary.tsx
 * - @frontend/src/components/shared/DataTableOptimizedVersion/DataTableOptimized.tsx
 * ============================================================================
 */
