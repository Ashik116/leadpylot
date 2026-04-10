import ExportDialog from '@/components/shared/ExportDialog';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useCurrentPageColumnsStore } from '@/stores/currentPageColumnsStore';
import { useExportDataStore } from '@/stores/exportDataStore';
import { useSelectedItemsStore } from '@/stores/selectedItemsStore';
import { useEffect, useState, useRef, useMemo } from 'react';

import { exportData, getFileSize } from '@/utils/exportUtils';
import useNotification from '@/utils/hooks/useNotification'; 
import { dateFormateUtils } from '@/utils/dateFormateUtils';
import { parseKNumber } from '@/utils/utils';

// Stable empty array reference to prevent infinite loops
const EMPTY_SELECTED_ITEMS: Record<string, any>[] = [];

const DataExchange = () => {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const { openNotification } = useNotification();
 

  // Helper function to map common fields for offers, openings, confirmations, and payment vouchers
  const mapCommonOfferFields = (item: any, pageType: string) => {
    // Detect data format based on structure
    const isOpeningFormat = item.offer_id && typeof item.offer_id === 'object'; // Has offer_id wrapper
    const isGroupedFormat = !isOpeningFormat && item.lead_id && typeof item.lead_id === 'object'; // Direct nested objects
    // Flattened structure is the default case (no need for explicit variable)
    // Helper function to safely extract nested values
    const safeExtract = (obj: any, path: string, fallback: any = '') => {
      return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : fallback;
      }, obj);
    };
    // Unified mapping that handles all three formats
    const baseFields = {
      // Lead information
      leadName: isOpeningFormat
        ? safeExtract(item, 'offer_id.lead_id.contact_name')
        : isGroupedFormat
          ? safeExtract(item, 'lead_id.contact_name')
          : item.leadName || '',

      leadEmail: isOpeningFormat
        ? safeExtract(item, 'offer_id.lead_id.email_from')
        : isGroupedFormat
          ? safeExtract(item, 'lead_id.email_from')
          : item.email_from || item.email || '',

      phone: isOpeningFormat
        ? safeExtract(item, 'offer_id.lead_id.phone')
        : isGroupedFormat
          ? safeExtract(item, 'lead_id.phone')
          : item.phone || '',

      partnerId: isOpeningFormat
        ? safeExtract(item, 'offer_id.lead_id.lead_source_no')
        : isGroupedFormat
          ? safeExtract(item, 'lead_id.lead_source_no')
          : item.lead_source_no || '',

      lead_status: isOpeningFormat
        ? safeExtract(item, 'offer_id.lead_id.status')
        : isGroupedFormat
          ? safeExtract(item, 'lead_id.status')
          : item.leadStatus || '',

      // Project information
      projectName: isOpeningFormat
        ? safeExtract(item, 'offer_id.project_id.name')
        : isGroupedFormat
          ? safeExtract(item, 'project_id.name')
          : item.projectName || '',

      // Agent information
      agent: isOpeningFormat
        ? safeExtract(item, 'offer_id.agent_id.login')
        : isGroupedFormat
          ? safeExtract(item, 'agent_id.login')
          : item.agent || '',

      // Bank information
      bankName: isOpeningFormat
        ? safeExtract(item, 'offer_id.bank_id.name')
        : isGroupedFormat
          ? safeExtract(item, 'bank_id.name')
          : item.bankName || '',

      // Financial information - convert formatted numbers (1k -> 1000)
      investmentVolume: (() => {
        const rawValue = isOpeningFormat
          ? safeExtract(item, 'offer_id.investment_volume') || 0
          : isGroupedFormat
            ? item.investment_volume || 0
            : item.investmentVolume || 0;
        const parsed = parseKNumber(rawValue);
        return isNaN(parsed) ? 0 : parsed;
      })(),

      investment_volume: (() => {
        const rawValue = isOpeningFormat
          ? safeExtract(item, 'offer_id.investment_volume') || 0
          : isGroupedFormat
            ? item.investment_volume || 0
            : item.investmentVolume || 0;
        const parsed = parseKNumber(rawValue);
        return isNaN(parsed) ? 0 : parsed;
      })(),

      interestRate: (() => {
        const rawValue = isOpeningFormat
          ? safeExtract(item, 'offer_id.interest_rate') || 0
          : isGroupedFormat
            ? item.interest_rate || 0
            : item.interestRate || 0;
        const parsed = parseKNumber(rawValue);
        return isNaN(parsed) ? 0 : parsed;
      })(),

      interest_rate: (() => {
        const rawValue = isOpeningFormat
          ? safeExtract(item, 'offer_id.interest_rate') || 0
          : isGroupedFormat
            ? item.interest_rate || 0
            : item.interestRate || 0;
        const parsed = parseKNumber(rawValue);
        return isNaN(parsed) ? 0 : parsed;
      })(),

      bonusAmount: (() => {
        const rawValue = isOpeningFormat
          ? safeExtract(item, 'offer_id.bonus_amount.info.amount', 0)
          : isGroupedFormat
            ? safeExtract(item, 'bonus_amount.info.amount', 0)
            : item.bonusAmount || 0;
        const parsed = parseKNumber(rawValue);
        return isNaN(parsed) ? 0 : parsed;
      })(),

      interestMonth: isOpeningFormat
        ? safeExtract(item, 'offer_id.payment_terms.info.info.months', 0)
        : isGroupedFormat
          ? safeExtract(item, 'payment_terms.info.info.months', 0)
          : item.interestMonth || 0,

      // Source information
      source_id: isOpeningFormat
        ? safeExtract(item, 'offer_id.lead_id.source_id.name')
        : isGroupedFormat
          ? safeExtract(item, 'lead_id.source_id.name')
          : item.source_name || '',

      // Offer information - prioritize offer_id data for opening format
      status: isOpeningFormat
        ? safeExtract(item, 'offer_id.status') || item.status || ''
        : item.status || '',

      title: isOpeningFormat
        ? safeExtract(item, 'offer_id.title') || item.title || ''
        : item.title || '',

      reference_no: isOpeningFormat
        ? safeExtract(item, 'offer_id.reference_no') || item.reference_no || ''
        : item.reference_no || '',

      offerType: isOpeningFormat
        ? safeExtract(item, 'offer_id.offerType') || item.offerType || ''
        : item.offerType || '',

      flex_option: isOpeningFormat
        ? safeExtract(item, 'offer_id.flex_option') || item.flex_option || false
        : item.flex_option || false,

      active: item.active || false,

      nametitle: isOpeningFormat
        ? safeExtract(item, 'offer_id.nametitle') || item.nametitle || ''
        : item.nametitle || '',

      // Date fields - use root level for opening format, offer_id level as fallback
      createdAt: dateFormateUtils(
        item.createdAt ||
          item.created_at ||
          (isOpeningFormat ? safeExtract(item, 'offer_id.createdAt') : null) ||
          (isOpeningFormat ? safeExtract(item, 'offer_id.created_at') : null)
      ),

      updatedAt: dateFormateUtils(
        item.updatedAt ||
          item.updated_at ||
          (isOpeningFormat ? safeExtract(item, 'offer_id.updatedAt') : null) ||
          (isOpeningFormat ? safeExtract(item, 'offer_id.updated_at') : null)
      ),

      // File information - prioritize root level, fallback to offer_id
      files: item.files || (isOpeningFormat ? safeExtract(item, 'offer_id.files', []) : []),
      filesCount: Array.isArray(item.files)
        ? item.files.length
        : isOpeningFormat && Array.isArray(safeExtract(item, 'offer_id.files'))
          ? safeExtract(item, 'offer_id.files', []).length
          : 0,

      // Additional fields that might be present
      leadId: isOpeningFormat
        ? safeExtract(item, 'offer_id.lead_id._id')
        : isGroupedFormat
          ? safeExtract(item, 'lead_id._id')
          : item.leadId || '',

      // Opening-specific fields
      offerId: isOpeningFormat ? safeExtract(item, 'offer_id._id') : '',
      creatorId: isOpeningFormat ? safeExtract(item, 'creator_id._id') : '',
      creatorLogin: isOpeningFormat ? safeExtract(item, 'creator_id.login') : '',
      creatorRole: isOpeningFormat ? safeExtract(item, 'creator_id.role') : '',

      // MongoDB fields
      _id: item._id || '',
      __v: item.__v || 0,
    };

    // Adapt for other page types with additional page-specific fields
    switch (pageType) {
      case 'offers':
        return baseFields;

      case 'openings':
        return {
          ...baseFields,
          // Opening-specific fields are already included in baseFields
          // Add any additional opening-specific transformations here if needed
        };

      case 'confirmations':
        return {
          ...baseFields,
          // Add confirmation-specific fields here if needed
          // confirmationDate: isOpeningFormat ? safeExtract(item, 'confirmation_date') : '',
        };

      case 'payments':
        return {
          ...baseFields,
          // Add payment-specific fields here if needed
          // paymentDate: isOpeningFormat ? safeExtract(item, 'payment_date') : '',
          // paymentAmount: isOpeningFormat ? safeExtract(item, 'payment_amount') : 0,
        };

      default:
        return baseFields;
    }
  };
 

  // Get selected items from store - use page-specific getters
  const { getSelectedIds, getSelectedItems } = useSelectedItemsStore();
  const { getCurrentPageColumns } = useCurrentPageColumnsStore();
  const { setExportData, setSelectedColumns, getFilteredExportData, clearExportData } =
    useExportDataStore();

  // Use separate selectors to avoid creating new objects
  const storeCurrentPage = useSelectedItemsStore((state) => state.currentPage);
  const storeSelectedItems = useSelectedItemsStore((state) => state.selectedItems);
  const currentPage = storeCurrentPage;

  // Memoize selectedItems to only return items for current page
  // Primary path: Use store's selectedItems when storeCurrentPage matches (works for non-grouping mode)
  // Fallback path: When grouping is active, items might be stored but storeCurrentPage might not match,
  // so we check getSelectedItems with the current page as fallback
  const selectedItems = useMemo(() => {
    const page = currentPage || 'leads';
    
    // Primary path: Check if store's current page matches
    if (storeCurrentPage === page && storeSelectedItems.length > 0) {
      return storeSelectedItems;
    }
    
    // Fallback path: Check if there are selected IDs for this page (indicates items exist)
    // This handles the case when grouping is active and items are stored with a different page identifier
    const selectedIdsForPage = getSelectedIds(page);
    if (selectedIdsForPage.length > 0) {
      const itemsFromStore = getSelectedItems(page);
      if (itemsFromStore && itemsFromStore.length > 0) {
        return itemsFromStore;
      }
    }
    
    return EMPTY_SELECTED_ITEMS;
  }, [storeCurrentPage, storeSelectedItems, currentPage, getSelectedIds, getSelectedItems]);
  
  const selectedIds = useMemo(() => {
    return getSelectedIds(currentPage || 'leads');
  }, [getSelectedIds, currentPage]);
  
  // Use ref to track previous export data to prevent infinite loops
  const previousExportDataRef = useRef<string>('');

  // Clear export data when selections are cleared
  useEffect(() => {
    if (selectedItems.length === 0) {
      clearExportData();
      // Reset the ref when items are cleared so re-selection will trigger update
      previousExportDataRef.current = '';
      // Close export dialog if it's open
      if (isExportDialogOpen) {
        setTimeout(() => {
          setIsExportDialogOpen(false);
        }, 0);
      }
    }
  }, [selectedItems.length, clearExportData, isExportDialogOpen]);

  // Prepare export data when selected items or current page changes
  useEffect(() => {
    if (selectedItems.length === 0 || !currentPage) {
      return;
    }
    // DEBUG: Log selected data for reclamations export
    if (currentPage === 'reclamations') {
      // eslint-disable-next-line no-console
      console.log('[DataExchange] Reclamations selected data:', {
        currentPage,
        selectedItemsCount: selectedItems.length,
        selectedItems,
        storeCurrentPage,
        storeSelectedItemsCount: storeSelectedItems.length,
      });
    }
    let actualData: Record<string, any>[] = [];
    // Use selected items directly since they now contain full objects
    switch (currentPage) {
      case 'leads':
        actualData = selectedItems.map((item) => ({
          // Include all original properties
          ...item,
          // Add computed properties for better export readability
          status: item.status?.name || item.status?.code || '',
          imp_status: item?.duplicate_status,
          use_status: item?.use_status,
          reclamation_status: item?.reclamation_status,
          active: item?.active,
          usable: item?.usable,
          isWonStage: item?.stage?.isWonStage,
          stage_name: item.stage?.name,
          status_name: item.status?.name,
          status_code: item.status?.code,
          contact_name: item?.contact_name,
          email_from: item?.email_from,
          phone: item?.phone,
          expected_revenue: (() => {
            const rawValue = item?.expected_revenue;
            const parsed = parseKNumber(rawValue);
            return isNaN(parsed) ? 0 : parsed;
          })(),
          bonus_amount: (() => {
            if (!Array.isArray(item.project) || item.project.length === 0) return 0;

            const offers = item.project[0]?.agent?.offers;
            if (!Array.isArray(offers) || offers.length === 0) return 0;

            return offers.reduce((total, offer) => {
              const rawAmount =
                offer?.bonus_amount?.Amount || offer?.bonus_amount?.info?.amount || 0;
              const parsed = parseKNumber(rawAmount);
              const amount = isNaN(parsed) ? 0 : parsed;
              return total + amount;
            }, 0);
          })(),
          highest_bonus_amount: (() => {
            if (!Array.isArray(item.project) || item.project.length === 0) return 0;

            const offers = item.project[0]?.agent?.offers;
            if (!Array.isArray(offers) || offers.length === 0) return 0;

            const amounts = offers
              .map((offer) => {
                const rawAmount =
                  offer?.bonus_amount?.Amount || offer?.bonus_amount?.info?.amount || 0;
                const parsed = parseKNumber(rawAmount);
                return isNaN(parsed) ? 0 : parsed;
              })
              .filter((amount) => typeof amount === 'number' && amount > 0);

            return amounts.length > 0 ? Math.max(...amounts) : 0;
          })(),
          offer_count: (() => {
            if (!Array.isArray(item.project) || item.project.length === 0) return 0;

            const offers = item.project[0]?.agent?.offers;
            return Array.isArray(offers) ? offers.length : 0;
          })(),
          bank_name: (() => {
            if (!Array.isArray(item.project) || item.project.length === 0) return '';

            const offers = item.project[0]?.agent?.offers;
            if (!Array.isArray(offers) || offers.length === 0) return '';

            // Get bank name from the first offer
            const firstOffer = offers[0];
            return firstOffer?.bank?.name || '';
          })(),
          lead_source: item.source_id?.name || '',
          payment_months: (() => {
            if (!Array.isArray(item.project) || item.project.length === 0) return 0;

            const offers = item.project[0]?.agent?.offers;
            if (!Array.isArray(offers) || offers.length === 0) return 0;

            // Get months from payment terms of the first offer
            const firstOffer = offers[0];
            return firstOffer?.payment_terms?.info?.info?.months || 0;
          })(),
          leadPrice: (item as any)?.leadPrice || 0,
          investment_volume: (() => {
            if (!Array.isArray(item.project) || item.project.length === 0) return 0;

            const offers = item.project[0]?.agent?.offers;
            if (!Array.isArray(offers) || offers.length === 0) return 0;

            // Get investment Amount from the first offer
            const firstOffer = offers[0];
            const rawValue = firstOffer?.investment_volume || 0;
            const parsed = parseKNumber(rawValue);
            return isNaN(parsed) ? 0 : parsed;
          })(),
          interest_rate: (() => {
            if (!Array.isArray(item.project) || item.project.length === 0) return 0;

            const offers = item.project[0]?.agent?.offers;
            if (!Array.isArray(offers) || offers.length === 0) return 0;

            // Get interest rate from the first offer
            const firstOffer = offers[0];
            const rawValue = firstOffer?.interest_rate || 0;
            const parsed = parseKNumber(rawValue);
            return isNaN(parsed) ? 0 : parsed;
          })(),
          opening_active: (() => {
            if (!Array.isArray(item.project) || item.project.length === 0) return false;

            const offers = item.project[0]?.agent?.offers;
            if (!Array.isArray(offers) || offers.length === 0) return false;

            // Get opening active status from the first offer
            const firstOffer = offers[0];
            return firstOffer?.opening?.active || false;
          })(),
          confirmation_active: (() => {
            if (!Array.isArray(item.project) || item.project.length === 0) return false;

            const offers = item.project[0]?.agent?.offers;
            if (!Array.isArray(offers) || offers.length === 0) return false;

            // Get confirmation active status from the first offer
            const firstOffer = offers[0];
            return firstOffer?.opening?.confirmation?.active || false;
          })(),
          payment_voucher_active: (() => {
            if (!Array.isArray(item.project) || item.project.length === 0) return false;

            const offers = item.project[0]?.agent?.offers;
            if (!Array.isArray(offers) || offers.length === 0) return false;

            // Get payment voucher active status from the first offer
            const firstOffer = offers[0];
            return firstOffer?.opening?.confirmation?.paymentVoucher?.active || false;
          })(),

          source_id: item?.source_id,
          source_project: item?.source_project?.name || '',
          source_agent: item?.source_agent?.login || '',
          assigned_agent_login: item.assigned_agent?.login,
          assigned_agent_role: item.assigned_agent?.role,
          assigned_date: dateFormateUtils(item?.assigned_date),
          lead_date: dateFormateUtils(item?.lead_date),
          createdAt: dateFormateUtils(item?.createdAt),
          updatedAt: dateFormateUtils(item?.updatedAt),
          project_name:
            Array.isArray(item.project) && item.project.length > 0 ? item.project[0]?.name : '',
          project_closed_date: (item as any)?.project_closed_date || '',
          closure_reason: (item as any)?.closure_reason || '',
          agent:
            Array.isArray(item.project) && item.project.length > 0
              ? item.project[0]?.agent?.login
              : '',
        }));

        break;
      case 'projects':
        actualData = selectedItems.map((item: any) => ({
          // Include all original properties
          ...item,
          // Add computed properties for better export readability
          project_status: item.active ? 'Active' : 'Inactive',
          total_leads: item.users || 0, // Using users count as proxy for leads
          project_website: (item as any).project_website || '',
          deport_link: (item as any).deport_link || '',
          inbound_email: (item as any).inbound_email || '',
          inbound_number: (item as any).inbound_number || '',
          banks_names: (() => {
            if (!Array.isArray((item as any).banks) || (item as any).banks.length === 0) return '';
            return (item as any).banks.map((bank: any) => bank.name).join(', ');
          })(),
          agents_names: (() => {
            if (!Array.isArray((item as any).agents) || (item as any).agents.length === 0)
              return '';
            return (item as any).agents
              .map((agent: any) => agent.alias_name || agent.user?.name || '')
              .join(', ');
          })(),
        }));
        break;
      case 'users':
        actualData = selectedItems.map((item: any) => {
          // Flatten all primitive fields from root and info, skip MongoDB and nested/complex fields
          const rootFields: Record<string, any> = {};
          Object.entries(item).forEach(([key, value]) => {
            if (
              typeof value !== 'object' &&
              !Array.isArray(value) &&
              !key.startsWith('_') &&
              key !== '__v' &&
              key !== 'createdAt' &&
              key !== 'updatedAt' &&
              key !== 'info' // info handled below
            ) {
              rootFields[key] = value;
            }
          });
          const infoFields: Record<string, any> = {};
          if (item.info && typeof item.info === 'object') {
            Object.entries(item.info).forEach(([key, value]) => {
              if (
                typeof value !== 'object' &&
                !Array.isArray(value) &&
                !key.startsWith('_') &&
                key !== '__v' &&
                key !== 'createdAt' &&
                key !== 'updatedAt'
              ) {
                infoFields[`info.${key}`] = value;
              }
            });
          }
          return {
            ...rootFields,
            ...infoFields,
          };
        });
        break;
      case 'mailservers':
        actualData = selectedItems.map((item: any) => {
          // Flatten all primitive fields from root and info, skip MongoDB and nested/complex fields
          const rootFields: Record<string, any> = {};
          Object.entries(item).forEach(([key, value]) => {
            if (
              typeof value !== 'object' &&
              !Array.isArray(value) &&
              !key.startsWith('_') &&
              key !== '__v' &&
              key !== 'createdAt' &&
              key !== 'updatedAt' &&
              key !== 'info' // info handled below
            ) {
              rootFields[key] = value;
            }
          });
          // Flatten info object fields to root level without 'info.' prefix
          if (item.info && typeof item.info === 'object') {
            Object.entries(item.info).forEach(([key, value]) => {
              if (
                typeof value !== 'object' &&
                !Array.isArray(value) &&
                !key.startsWith('_') &&
                key !== '__v' &&
                key !== 'createdAt' &&
                key !== 'updatedAt'
              ) {
                rootFields[key] = value;
              }
            });
          }
          return {
            ...rootFields,
          };
        });
        break;
      case 'voip-servers':
        actualData = selectedItems.map((item: any) => {
          // Flatten all primitive fields from root and info, skip MongoDB and nested/complex fields
          const rootFields: Record<string, any> = {};
          Object.entries(item).forEach(([key, value]) => {
            if (
              typeof value !== 'object' &&
              !Array.isArray(value) &&
              !key.startsWith('_') &&
              key !== '__v' &&
              key !== 'createdAt' &&
              key !== 'updatedAt' &&
              key !== 'info' // info handled below
            ) {
              rootFields[key] = value;
            }
          });
          // Flatten info object fields to root level without 'info.' prefix
          if (item.info && typeof item.info === 'object') {
            Object.entries(item.info).forEach(([key, value]) => {
              if (
                typeof value !== 'object' &&
                !Array.isArray(value) &&
                !key.startsWith('_') &&
                key !== '__v' &&
                key !== 'createdAt' &&
                key !== 'updatedAt'
              ) {
                rootFields[key] = value;
              }
            });
          }
          return {
            ...rootFields,
          };
        });
        break;
      case 'offers':
      case 'openings':
      case 'confirmations':
      case 'payments':
        actualData = selectedItems.map((item: any) => mapCommonOfferFields(item, currentPage));
        break;
      case 'payment-terms':
        actualData = selectedItems.map((item: any) => ({
          // Map to the expected column structure
          type: item.info?.type || '',
          name: item.name || '',
          months: item.info?.info?.months || 0,
          description: item.info?.info?.description || '',
          createdAt: dateFormateUtils(item.createdAt),
          updatedAt: dateFormateUtils(item.updatedAt),
          // Additional computed properties for better export
          _id: item._id || '',
          __v: item.__v || 0,
        }));
        break;
      case 'banks':
        actualData = selectedItems.map((item: any) => ({
          state: item.state || '',
          name: item.name || '',
          address: item.address || '',
          phone: item.phone || '',
          email: item.email || '',
          min_limit: item.min_limit || 0,
          max_limit: item.max_limit || 0,
          account_number: item.account_number || '',
          iban: item.iban || '',
          swift_code: item.swift_code || '',
          lei_code: item.lei_code || '',
          is_default: item.is_default || false,
          is_allow: item.is_allow || false,
          multi_iban: item.multi_iban || false,
          code: item.code || '',
          contact: item.contact || '',
          note: item.note || '',
          instance_records: item.instance_records || '',
          create_date: dateFormateUtils(item.create_date),
          write_date: dateFormateUtils(item.write_date),
          createdAt: dateFormateUtils(item.createdAt),
          updatedAt: dateFormateUtils(item.updatedAt),
        }));
        break;
      case 'reclamations':
        // Map reclamation rows to export fields matching table columns (phone, email, partnerId, status, reason, response, createdAt)
        actualData = selectedItems.map((item: any) => {
          const statusVal = item?.status;
          const statusText =
            statusVal === 1 ? 'Accepted' : statusVal === 0 ? 'Pending' : 'Rejected';
          return {
            _id: item._id || '',
            phone: item?.lead_id?.phone || '',
            email: item?.lead_id?.email_from || '',
            partnerId: item?.lead_id?.lead_source_no || '',
            status: statusText,
            reason: item?.reason || '',
            response: item?.response || '',
            createdAt: dateFormateUtils(item?.lead_id?.lead_date || item?.createdAt),
          };
        });
        // eslint-disable-next-line no-console
        console.log('[DataExchange] Reclamations actualData (mapped for export):', {
          actualDataLength: actualData.length,
          actualData,
        });
        break;
      case 'sources':
        // Export not yet implemented for sources page
        actualData = [];
        break;
      case 'lead-projects':
        actualData = [];
        selectedItems.forEach((project: any) => {
          const projectFields = {
            projectName: project.projectName || '',
            totalOffers: project.offers?.total || 0,
            totalAgents: project.totalAgents || 0,
            totalLeads: project.totalLeads || 0,
          };
          (project.leads || []).forEach((leadItem: any) => {
            const lead = leadItem.lead || {};
            const assignment = leadItem.assignment || {};
            actualData.push({
              ...projectFields,
              contact_name: lead.contact_name || '',
              email_from: lead.email_from || '',
              phone: lead.phone || '',
              expected_revenue: lead.expected_revenue || 0,
              leadPrice: lead.leadPrice || 0,
              lead_date: dateFormateUtils(lead.lead_date),
              lead_source_no: lead.lead_source_no || '',
              stage: lead.stage || '',
              status: lead.status || '',
              active: lead.active || false,
              usable: lead.usable || '',
              use_status: lead.use_status || '',
              reclamation_status: lead.reclamation_status || '',
              duplicate_status: lead.duplicate_status || 0,
              checked: lead.checked || false,
              voip_extension: lead.voip_extension || '',
              write_date: dateFormateUtils(lead.write_date),
              assigned_date: dateFormateUtils(lead.assigned_date),
              notes: lead.notes || '',
              project_closed_date: dateFormateUtils(lead.project_closed_date),
              closure_reason: lead.closure_reason || '',
              createdAt: dateFormateUtils(lead.createdAt),
              updatedAt: dateFormateUtils(lead.updatedAt),
              assigned_agent_login: assignment.agent?.login || '',
              assigned_agent_role: assignment.agent?.role || '',
              assignment_notes: assignment.notes || '',
              assigned_at: dateFormateUtils(assignment.assignedAt),
              assigned_by: assignment.assignedBy || '',
              total_offers: project.offers?.total || 0,
              pending_offers: project.offers?.pending || 0,
              accepted_offers: project.offers?.accepted || 0,
              rejected_offers: project.offers?.rejected || 0,
              expired_offers: project.offers?.expired || 0,
            });
          });
        });
        break;
      default:
        // Unknown page type for export
        actualData = [];
        break;
    }

    // Create a stable key for comparison to prevent infinite loops
    // Include selectedItems length to ensure update when items change even if IDs are the same
    const exportDataKey = JSON.stringify({
      itemIds: selectedIds,
      itemIdsLength: selectedIds.length,
      itemsLength: selectedItems.length,
      page: currentPage,
      itemCount: actualData.length,
      // Include first and last item IDs to detect when same items are re-selected after clearing
      firstItemId: selectedItems[0]?._id,
      lastItemId: selectedItems[selectedItems.length - 1]?._id,
    });
    
    // Only update if the data has actually changed
    // Also force update if previous ref was cleared (empty string) - this handles re-selection after clearing
    if (previousExportDataRef.current !== exportDataKey || previousExportDataRef.current === '') {
      previousExportDataRef.current = exportDataKey;
      if (currentPage === 'reclamations') {
        // eslint-disable-next-line no-console
        console.log('[DataExchange] Calling setExportData for reclamations:', {
          actualDataLength: actualData.length,
          currentPage,
        });
      }
      setExportData(actualData, currentPage as any);
    }
  }, [selectedItems, selectedIds, currentPage, setExportData, storeCurrentPage, storeSelectedItems]);

  // Handle export functionality
  const handleExport = async (selectedColumns: string[], format: string, filename: string) => {
    setSelectedColumns(selectedColumns);

    const filteredData = getFilteredExportData();

    try {
      // Export the filtered data
      exportData(filteredData, currentPage || 'data', {
        format: format as 'csv' | 'xlsx' | 'xls',
        filename: `${filename}.${format}`,
        includeHeaders: true,
      });

      // Show success notification
      const fileSize = getFileSize(JSON.stringify(filteredData));
      openNotification({
        type: 'success',
        massage: `Successfully exported ${filteredData.length} rows with ${selectedColumns.length} columns as ${format.toUpperCase()} (${fileSize})`,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Export failed:', error);
      openNotification({
        type: 'danger',
        massage: 'Failed to export data. Please try again.',
      });
    }
  };

  const handleExportClick = () => {
    if (selectedItems.length === 0) {
      openNotification({
        type: 'warning',
        massage: 'Please select at least one item to export.',
      });
      return;
    }
    setIsExportDialogOpen(true);
  };

  return (
    <>
      {/* Settings Dropdown with Export Option - Only show when items are selected */}
      {selectedItems.length > 0 && (
        // <Dropdown
        //   renderTitle={
        //     <Button
        //       size="sm"
        //       variant="plain"
        //       icon={<ApolloIcon name="cog" className="text-lg" />}
        //       className="px-1 hover:bg-gray-100"
        //       gapClass="gap-0 md:gap-1"
        //     >
        //       <div className="hidden text-sm md:block">Export</div>
        //     </Button>
        //   }
        // >
        //   <Dropdown.Item onClick={handleClickImportLeads}>
        //     <ApolloIcon name="download" className="mr-2 text-lg" />
        //     Import Leads
        //   </Dropdown.Item>
        //   <Dropdown.Item onClick={handleExportClick}>
        //     <ApolloIcon name="upload" className="mr-2 text-lg" />
        //     Export
        //   </Dropdown.Item>
        // </Dropdown>
        <Button
        size="sm"
        variant="plain"
        onClick={handleExportClick}
        icon={<ApolloIcon name="cog" className="text-md" />}
        className="px-1 hover:bg-gray-100"
        gapClass="gap-0 lg:gap-1 "
      >
        <div className="hidden text-sm lg:block">Export</div>
      </Button>
      )}

      {/* Export Dialog */}
      <ExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => {
          setIsExportDialogOpen(false);
        }}
        columns={getCurrentPageColumns()}
        tableName={currentPage || 'data'}
        selectedItems={selectedIds}
        onExport={handleExport}
      />
    </>
  );
};

export default DataExchange;
