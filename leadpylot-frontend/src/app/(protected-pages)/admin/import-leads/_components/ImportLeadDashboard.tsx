/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import Notification from '@/components/ui/Notification';
import Select from '@/components/ui/Select';
import toast from '@/components/ui/toast';
import Upload from '@/components/ui/Upload';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useSetBackUrl } from '@/hooks/useSetBackUrl';
import { useImportLeads, useImportOffers, useSources } from '@/services/hooks/useLeads';
import { apiDownloadFailedImports, apiDownloadFailedOffersImports, isAsyncImportResponse, apiImportLeads } from '@/services/LeadsService';
import { useQueryClient } from '@tanstack/react-query';
import { apiUpdateSource } from '@/services/SourceService';
import { useUpdateSource } from '@/services/hooks/useSources';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import RecentImportDashboard from '../../recent-imports/components/RecentImportDashboard';
import { CreateSourcesDialog } from '../../sources/_components/CreateSourcesDialog';
import { EditSourceDialog } from './EditSourceDialog';
import OffersImportHistory from './OffersImportHistory';
import ImportProgressDialog from './ImportProgressDialog';
import { useImportProgress } from '@/services/hooks/useImportProgress';

function SourceNameColorDot({ color }: { color?: string | null }) {
  if (!color) return null;
  return (
    <span
      className="mr-2 inline-block h-5 w-5 shrink-0 rounded-full border border-gray-200/90 shadow-sm ring-1 ring-black/5 dark:border-gray-600 dark:ring-white/10"
      style={{ backgroundColor: color }}
      title={color}
      role="img"
      aria-label={`Source color ${color}`}
    />
  );
}

const ImportLeadDashboard = () => {
  const pathname = usePathname();
  useSetBackUrl(pathname);
  const router = useRouter();
  const queryClient = useQueryClient();
  const importLeadsMutation = useImportLeads();
  const importOffersMutation = useImportOffers();

  // Import progress tracking hook
  const importProgress = useImportProgress();

  // Import type selection
  const [importType, setImportType] = useState<'leads' | 'offers'>('leads');

  // Fetch sources from API
  const { data: sourcesResponse, isLoading: isLoadingSources } = useSources();
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [customLeadPrice, setCustomLeadPrice] = useState<number | null>(null);
  const [editSourcePrice, setEditSourcePrice] = useState(false);
  const [tempPrice, setTempPrice] = useState<string>('');
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileList, setFileList] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [pendingSourceSelection, setPendingSourceSelection] = useState<string | null>(null);
  // Dialog states
  const [createSourceDialogOpen, setCreateSourceDialogOpen] = useState(false);
  const [editSourceDialogOpen, setEditSourceDialogOpen] = useState(false);
  const [selectedSourceForEdit, setSelectedSourceForEdit] = useState<string>('');

  // Import result dialog state
  const [importResultDialogOpen, setImportResultDialogOpen] = useState(false);

  // Progress dialog state (for async imports)
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);

  // Import result state
  const [importResult, setImportResult] = useState<{
    failureCount: number;
    successCount: number;
    downloadLink?: string;
    message?: string;
    duplicateStatusSummary?: {
      new: number;
      oldDuplicate: number;
      duplicate: number;
    };
  } | null>(null);

  // Import type options
  const importTypeOptions = [
    { value: 'leads', label: 'Import Leads' },
    { value: 'offers', label: 'Import Offers' },
  ];

  // Transform sources data for the dropdown
  const sourceOptions =
    sourcesResponse?.data?.map((source) => {
      // Safely extract provider name
      let providerName = '';
      if (source.provider) {
        if (typeof source.provider === 'object' && (source.provider as { name: string }).name) {
          providerName = (source.provider as { name: string }).name;
        } else if (typeof source.provider === 'string') {
          providerName = source.provider;
        }
      }

      return {
        value: source._id,
        label: source.name,
        price: source.price,
        provider: providerName,
        color: source.color ?? null,
      };
    }) || [];

  // Effect to handle auto-selection after sources are refreshed
  useEffect(() => {
    if (pendingSourceSelection && sourcesResponse && !isLoadingSources) {
      // Check if the pending source exists in the refreshed data
      const sourceExists = sourcesResponse.data.some(
        (source) => source._id === pendingSourceSelection
      );

      if (sourceExists) {
        // Set the selected source ID
        setSelectedSourceId(pendingSourceSelection);
        // Clear the pending selection
        setPendingSourceSelection(null);
      }
    }
  }, [sourcesResponse, isLoadingSources, pendingSourceSelection]);

  // Reset source selection when switching to offers import
  useEffect(() => {
    if (importType === 'offers') {
      setSelectedSourceId('');
      setCustomLeadPrice(null);
    }
  }, [importType]);

  // Log when source selection changes
  useEffect(() => {
    if (selectedSourceId) {
    }
  }, [selectedSourceId]);

  // Track if import is in progress
  const isImportInProgress = isSubmitting || uploading || importLoading;
  const importStartPathnameRef = useRef<string>('');
  const isPreventingNavigationRef = useRef<boolean>(false);

  // Prevent page refresh during import
  useEffect(() => {
    if (!isImportInProgress) {
      // Reset the import start pathname when import is not in progress
      importStartPathnameRef.current = '';
      return;
    }

    // Store the pathname when import starts
    if (!importStartPathnameRef.current) {
      importStartPathnameRef.current = pathname;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore custom messages and show their own
      e.returnValue = '';
      // Note: Toast won't show here as page is unloading, browser will show its own warning
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isImportInProgress, pathname]);

  // Prevent navigation during import
  useEffect(() => {
    // Skip if not importing or if we're currently preventing navigation (to avoid loops)
    if (!isImportInProgress || isPreventingNavigationRef.current) {
      if (!isImportInProgress) {
        importStartPathnameRef.current = '';
      }
      return;
    }

    // Check if pathname changed (navigation attempted) and we have a stored start pathname
    if (importStartPathnameRef.current && pathname !== importStartPathnameRef.current) {
      // Set flag to prevent infinite loop
      isPreventingNavigationRef.current = true;

      // Show warning toast
      toast.push(
        <Notification title="Import In Progress" type="warning">
          Please wait! Navigating away during import may cause issues. Please wait for the import to
          complete.
        </Notification>
      );

      // Prevent navigation by going back to import page
      router.push(importStartPathnameRef.current);

      // Reset flag after a short delay
      setTimeout(() => {
        isPreventingNavigationRef.current = false;
      }, 100);
    }
  }, [pathname, isImportInProgress, router]);

  // Custom components for Select
  const customComponents = {
    SingleValue: ({ data }: any) => {
      return (
        <div className="flex w-full min-w-0 items-center">
          <SourceNameColorDot color={data.color} />
          <span className="font-regular truncate">
            {data.label}
            {data.provider ? ` - ${data.provider}` : ''}
          </span>
        </div>
      );
    },
    Option: ({ innerProps, data, isSelected }: any) => {
      // Check if this is our custom "Add New Source" option
      if (data.value === 'add-new-source') {
        return (
          <div
            {...innerProps}
            className="text-ocean-2 hover:bg-sand-5 flex cursor-pointer items-center px-3 py-2"
            onClick={() => setCreateSourceDialogOpen(true)}
          >
            <ApolloIcon name="plus" className="mr-2" />
            Add New Source
          </div>
        );
      }

      // Regular option
      return (
        <div
          {...innerProps}
          className={`cursor-pointer px-3 py-2 ${isSelected ? 'bg-ocean-4' : 'hover:bg-sand-5'}`}
        >
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-start">
              <SourceNameColorDot color={data.color} />
              <div className="min-w-0 flex-1">
                <div>
                  <span>{data.label}</span>
                  {data.price !== undefined && (
                    <span className="text-sand-2 ml-2">${data.price.toFixed(2)} - </span>
                  )}
                  {data.provider && <span className="text-sand-2"> {data.provider}</span>}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="text-ocean-2 hover:text-ocean-1"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedSourceForEdit(data.value);
                setEditSourceDialogOpen(true);
              }}
            >
              <ApolloIcon name="pen" className="text-sm" />
            </button>
          </div>
        </div>
      );
    },
    MenuList: ({ children, innerProps, ...props }: any) => {
      return (
        <div className="py-1" {...innerProps}>
          {children}
        </div>
      );
    },
    // This ensures the "Add New Source" option is always visible
    NoOptionsMessage: ({ innerProps, ...props }: any) => {
      return (
        <div
          className="text-ocean-2 hover:bg-sand-5 flex cursor-pointer items-center px-3 py-2"
          onClick={() => setCreateSourceDialogOpen(true)}
        >
          <ApolloIcon name="plus" className="text-ocean-2 mr-2" />
          Add New Source
        </div>
      );
    },
  };

  // Handle import type change
  const handleImportTypeChange = (option: any) => {
    if (option) {
      setImportType(option.value);
    }
  };

  // Handle source selection
  const handleSourceChange = (option: any) => {
    if (option) {
      setSelectedSourceId(option.value);
      // Set the custom lead price to the source's price initially
      const sourcePrice = sourceOptions.find((src) => src.value === option.value)?.price;
      setCustomLeadPrice(sourcePrice !== undefined ? sourcePrice : null);
    } else {
      setSelectedSourceId('');
      setCustomLeadPrice(null);
    }
  };

  // Get the selected source price
  const getSelectedSourcePrice = () => {
    if (!selectedSourceId) return null;
    const selectedSource = sourceOptions.find((option) => option.value === selectedSourceId);
    return selectedSource?.price;
  };

  const selectedSourcePrice = getSelectedSourcePrice();

  // Handle price change in dialog
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow valid price formats
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setTempPrice(value);
    }
  };

  // Handle keyboard events for price input
  const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSavePrice();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelPriceEdit();
    }
  };

  // Cancel price edit
  const handleCancelPriceEdit = () => {
    setEditSourcePrice(false);
    setTempPrice('');
  };

  // Save the price from dialog
  const handleSavePrice = async () => {
    if (!selectedSourceId) {
      toast.push(
        <Notification title="Error" type="warning">
          Please select a source first.
        </Notification>
      );
      return;
    }

    const numValue = parseFloat(tempPrice);
    if (tempPrice === '' || isNaN(numValue) || numValue < 0) {
      toast.push(
        <Notification title="Invalid Price" type="warning">
          Please enter a valid price.
        </Notification>
      );
      return;
    }

    setIsUpdatingPrice(true);

    try {
      // Update the source price via API
      await apiUpdateSource(selectedSourceId, {
        price: numValue,
      });

      // Invalidate queries to refresh the sources list
      queryClient.invalidateQueries({ queryKey: ['source', selectedSourceId] });
      queryClient.invalidateQueries({ queryKey: ['sources'] });

      // Update local state
      setCustomLeadPrice(numValue);
      setEditSourcePrice(false);
      setTempPrice('');

      toast.push(
        <Notification title="Price Updated" type="success">
          Source price updated successfully.
        </Notification>
      );
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || 'Failed to update source price. Please try again.';
      toast.push(
        <Notification title="Update Failed" type="danger">
          {errorMessage}
        </Notification>
      );
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  // Open price edit dialog
  const openPriceDialog = () => {
    const currentPrice = customLeadPrice !== null ? customLeadPrice : selectedSourcePrice;
    setTempPrice(
      currentPrice !== null && currentPrice !== undefined ? currentPrice.toString() : ''
    );
    setEditSourcePrice(true);
  };

  // Handle file upload
  const handleFileUpload = (files: File[]) => {
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];
    const allowedExtensions = ['xls', 'xlsx', 'csv'];

    // Validate file type
    const file = files[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';

    if (
      !allowedExtensions.includes(fileExtension) ||
      !allowedTypes.some((type) => file.type === type)
    ) {
      toast.push(
        <Notification title="No Selection" type="warning">
          &apos;Please upload a valid file format (xls, xlsx, or csv)&apos;
        </Notification>
      );
      return;
    }

    setFileList([file]);
  };

  // Handle file removal
  const handleFileRemove = () => {
    setFileList([]);
  };

  // Handle download of failed imports
  const handleDownloadFailedImports = () => {
    if (!importResult?.downloadLink) return;

    // For offers import, the download link might be a relative path
    let downloadUrl = importResult.downloadLink;
    if (importType === 'offers' && downloadUrl.startsWith('/')) {
      // If it's a relative path, we need to construct the full URL
      downloadUrl = downloadUrl;
    }

    // Use appropriate download function based on import type
    if (importType === 'offers') {
      apiDownloadFailedOffersImports(
        downloadUrl,
        `failed-${importType}-imports-${new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)}.xlsx`
      );
    } else {
      apiDownloadFailedImports(
        downloadUrl,
        `failed-${importType}-imports-${new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)}.xlsx`
      );
    }

    setImportResultDialogOpen(false);
    setFileList([]);

    // Navigate to appropriate page based on import type
    if (importType === 'leads') {
      router.push('/dashboards/leads/pending-leads');
    } else {
      router.push('/dashboards/offers');
    }
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setImportResultDialogOpen(false);
    setFileList([]);

    // Navigate to appropriate page based on import type
    if (importType === 'leads') {
      router.push('/dashboards/leads/pending-leads');
    } else {
      router.push('/dashboards/offers');
    }
  };

  // Confirm import handler
  const handleConfirmImport = async () => {
    // Validate inputs
    if (fileList.length === 0) {
      toast.push(
        <Notification title="Validation Error" type="warning">
          No file to upload.
        </Notification>
      );
      return;
    }

    // For leads import, validate source selection
    if (importType === 'leads' && !selectedSourceId) {
      toast.push(
        <Notification title="Validation Error" type="warning">
          Please select a source for the leads.
        </Notification>
      );
      return;
    }

    // Set loading state
    setImportLoading(true);

    try {
      let result;

      if (importType === 'leads') {
        // Use the custom lead price if set, otherwise use the source's default price
        const leadPrice =
          customLeadPrice !== null
            ? customLeadPrice
            : sourceOptions.find((source) => source.value === selectedSourceId)?.price;

        // Check file size to determine if we should force async processing
        const fileSizeKB = fileList[0].size / 1024;
        const forceAsync = fileSizeKB > 500; // Force async for files > 500KB

        // Call the import leads API directly to handle both sync and async responses
        const response = await apiImportLeads(
          fileList[0],
          selectedSourceId,
          leadPrice,
          forceAsync
        );

        // Check if this is an async response (202 Accepted)
        if (isAsyncImportResponse(response)) {
          // Start tracking progress
          importProgress.startTracking(response.importId);
          setProgressDialogOpen(true);
          setImportLoading(false);

          toast.push(
            <Notification title="Import Started" type="info">
              Your import has started processing in the background.
            </Notification>
          );
          return;
        }

        // Synchronous response - use the result directly
        result = response;
      } else {
        // Call the import offers API
        const offersResult = await importOffersMutation.mutateAsync({
          file: fileList[0],
        });

        // Transform offers result to match the expected format
        result = {
          successCount: offersResult.data.successCount,
          failureCount: offersResult.data.failureCount,
          downloadLink: offersResult.data.downloadLink,
          message: offersResult.message,
        };
      }

      // Store result and show dialog for imports
      setImportResult(result);
      setImportResultDialogOpen(true);

      // Clear file list if all imports were successful
      if (result.failureCount === 0) {
        setFileList([]);
      }
    } catch (error) {
      toast.push(
        <Notification title="Import Failed" type="danger">
          Failed to import {importType}. Please try again.
        </Notification>
      );
    } finally {
      setImportLoading(false);
    }
  };

  // Handle progress dialog close
  const handleProgressDialogClose = useCallback(() => {
    setProgressDialogOpen(false);
    importProgress.reset();
    setFileList([]);

    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    queryClient.invalidateQueries({ queryKey: ['recent-imports'] });
  }, [importProgress, queryClient]);

  // Handle download failed from progress dialog
  const handleProgressDownloadFailed = useCallback(() => {
    if (importProgress.progress?.result?.downloadLink) {
      apiDownloadFailedImports(
        importProgress.progress.result.downloadLink,
        `failed-leads-imports-${new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)}.xlsx`
      );
    }
  }, [importProgress.progress?.result?.downloadLink]);

  // Handle navigate to leads from progress dialog
  const handleProgressNavigateToLeads = useCallback(() => {
    handleProgressDialogClose();
    router.push('/dashboards/leads/pending-leads');
  }, [handleProgressDialogClose, router]);

  return (
    <div className="text-sm">
      {/* Create Source Dialog */}
      <CreateSourcesDialog
        isOpen={createSourceDialogOpen}
        onClose={(newSourceId) => {
          setCreateSourceDialogOpen(false);
          // Auto-select the newly created source if ID is returned
          if (newSourceId) {
            // Invalidate sources query to refresh the data
            queryClient.invalidateQueries({ queryKey: ['sources'] });
            // Store the ID to select after data is refreshed
            setPendingSourceSelection(newSourceId);
          }
        }}
      />

      {/* Import Results Dialog */}
      <Dialog
        isOpen={importResultDialogOpen}
        onClose={handleDialogClose}
        width={600}
        className="mx-auto"
      >
        <div className="p-8">
          <div className="text-center">
            <h4 className="mb-6 text-sm font-bold">Import Results Summary</h4>
            <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-4 md:grid-cols-2">
              <div className="bg-moss-4/10 hover:bg-moss-4/20 border-moss-3/30 rounded-xl border px-5 py-4 text-center shadow-sm transition-all duration-300">
                <Link
                  href={
                    importType === 'leads'
                      ? `/dashboards/leads/pending-leads?status=0&total=${importResult?.duplicateStatusSummary?.new}`
                      : '/dashboards/offers'
                  }
                  className="flex h-full flex-col items-center justify-center"
                >
                  <p className="text-moss-2 mb-1 text-3xl font-bold">
                    {importType === 'leads'
                      ? importResult?.duplicateStatusSummary?.new || 0
                      : importResult?.successCount || 0}
                  </p>
                  <p className="text-moss-1">
                    {importType === 'leads' ? 'New Leads' : 'Successful Imports'}
                  </p>
                </Link>
              </div>
              <div className="bg-rust/5 hover:bg-rust/10 border-rust/20 rounded-xl border px-5 py-4 text-center shadow-sm transition-all duration-300">
                <Link
                  href={
                    importType === 'leads'
                      ? '/dashboards/leads/pending-leads'
                      : '/dashboards/offers'
                  }
                  className="flex h-full flex-col items-center justify-center"
                >
                  <p className="text-rust mb-1 text-3xl font-bold">
                    {importResult?.failureCount || 0}
                  </p>
                  <p className="text-rust/90">Failed to Import</p>
                </Link>
              </div>
              {importType === 'leads' && (
                <>
                  <div className="rounded-xl border border-amber-200/30 bg-amber-50 px-5 py-4 text-center shadow-sm transition-all duration-300 hover:bg-amber-100/50">
                    <Link
                      href={`/dashboards/leads/pending-leads?status=1&total=${importResult?.duplicateStatusSummary?.duplicate}`}
                      className="flex h-full flex-col items-center justify-center"
                    >
                      <p className="mb-1 text-3xl font-bold text-amber-700">
                        {importResult?.duplicateStatusSummary?.duplicate || 0}
                      </p>
                      <p className="text-amber-800/80">Duplicate</p>
                    </Link>
                  </div>
                  <div className="rounded-xl border border-rose-200/30 bg-rose-50 px-5 py-4 text-center shadow-sm transition-all duration-300 hover:bg-rose-100/50">
                    <Link
                      href={`/dashboards/leads/pending-leads?status=2&total=${importResult?.duplicateStatusSummary?.oldDuplicate}`}
                      className="flex h-full flex-col items-center justify-center"
                    >
                      <p className="mb-1 text-3xl font-bold text-rose-600">
                        {importResult?.duplicateStatusSummary?.oldDuplicate || 0}
                      </p>
                      <p className="text-rose-700/80">10 Week Duplicate</p>
                    </Link>
                  </div>
                </>
              )}
            </div>

            <div className="text-sand-2 mb-4">
              {importResult?.failureCount ? (
                <p>
                  Some {importType} {`couldn't`} be imported due to validation errors or duplicate
                  entries. Please download the file below to review and correct these records.
                </p>
              ) : (
                <p>
                  All {importType} were imported successfully! You can now view and manage them in
                  the
                  {importType === 'leads' ? ' pending leads' : ' offers'} section.
                </p>
              )}
            </div>

            <div className="flex justify-center gap-4">
              {/* Show download button only if there are failed imports */}
              {importResult?.downloadLink && (
                <Button
                  variant="solid"
                  color="ocean"
                  onClick={handleDownloadFailedImports}
                  icon={<ApolloIcon name="download" className="mr-2" />}
                >
                  Download Failed Records
                </Button>
              )}

              {/* Always show the Go to page button */}
              <Button variant="plain" className="bg-sand-5" onClick={handleDialogClose}>
                {importResult?.failureCount
                  ? 'Skip & Close'
                  : `Go to ${importType === 'leads' ? 'Pending Leads' : 'Offers'}`}
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Edit Source Dialog */}
      <EditSourceDialog
        isOpen={editSourceDialogOpen}
        onClose={(updatedSourceId) => {
          setEditSourceDialogOpen(false);
          // Auto-select the edited source if ID is returned
          if (updatedSourceId) {
            // Invalidate sources query to refresh the data
            queryClient.invalidateQueries({ queryKey: ['sources'] });
            // Store the ID to select after data is refreshed
            setPendingSourceSelection(updatedSourceId);
          }
        }}
        sourceId={selectedSourceForEdit}
      />

      {/* Import Progress Dialog (for async imports) */}
      <ImportProgressDialog
        isOpen={progressDialogOpen}
        onClose={handleProgressDialogClose}
        progress={importProgress.progress}
        isCompleted={importProgress.isCompleted}
        isFailed={importProgress.isFailed}
        onDownloadFailed={handleProgressDownloadFailed}
        onNavigateToLeads={handleProgressNavigateToLeads}
      />

      <div className="flex justify-center border-b-2 border-gray-100">
        <Card className="w-full border-none xl:max-w-[1000px]">
          <div className="w-full">
            <h2 className="mb-2 text-sm font-bold">
              Import {importType === 'leads' ? 'Leads' : 'Offers'}
            </h2>

            {/* Import Type Selection */}
            <div className="mb-2">
              <p className="mb-2">Import Type</p>
              <Select
                instanceId="import-type-select"
                options={importTypeOptions}
                onChange={handleImportTypeChange}
                value={importTypeOptions.find((option) => option.value === importType)}
                placeholder="Select import type"
              />
            </div>

            {/* Source Selection - Only show for leads import */}
            {importType === 'leads' && (
              <>
                <div
                  className={`flex flex-col gap-2 ${selectedSourcePrice !== null && selectedSourcePrice !== undefined ? 'mb-2' : 'mb-4'}`}
                >
                  <p className="font-sm font-medium">Source</p>
                  <div className="flex-1">
                    <Select
                      instanceId="source-select"
                      options={[
                        ...sourceOptions,
                        { value: 'add-new-source', label: 'Add New Source' },
                      ]}
                      onChange={handleSourceChange}
                      isLoading={isLoadingSources}
                      placeholder="Select a source"
                      components={customComponents}
                      filterOption={(option, inputValue) => {
                        // Always include "Add New Source" option regardless of search
                        if (option.value === 'add-new-source') return true;

                        // For other options, use default filtering
                        return option.label.toLowerCase().includes(inputValue.toLowerCase());
                      }}
                    />
                  </div>
                </div>

                {selectedSourcePrice !== null && selectedSourcePrice !== undefined && (
                  <div className="mb-4 text-left">
                    <div className="flex items-center justify-between">
                      <p className="font-sm font-medium">Source Price:</p>

                      <div className="flex items-center gap-4">
                        {editSourcePrice && (
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              value={tempPrice}
                              onChange={handlePriceChange}
                              onKeyDown={handlePriceKeyDown}
                              className="w-40 font-semibold"
                              placeholder={selectedSourcePrice?.toFixed(2) || '0.00'}
                              autoFocus
                              disabled={isUpdatingPrice}
                            />
                            <Button
                              size="sm"
                              variant="plain"
                              icon={<ApolloIcon name="check" className="text-sm" />}
                              onClick={handleSavePrice}
                              loading={isUpdatingPrice}
                              disabled={isUpdatingPrice}
                            />
                            <Button
                              size="sm"
                              variant="plain"
                              icon={<ApolloIcon name="times" className="text-sm" />}
                              onClick={handleCancelPriceEdit}
                              disabled={isUpdatingPrice}
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800">
                            $
                            {customLeadPrice !== null
                              ? customLeadPrice.toFixed(2)
                              : selectedSourcePrice.toFixed(2)}
                          </span>
                          <Button
                            size="sm"
                            variant="plain"
                            icon={<ApolloIcon name="pen" className="text-sm" />}
                            onClick={openPriceDialog}
                          />
                        </div>
                      </div>
                    </div>
                    {customLeadPrice !== null && customLeadPrice !== selectedSourcePrice && (
                      <p className="mt-1 text-right text-xs text-gray-500">
                        Custom price set (Default: ${selectedSourcePrice.toFixed(2)})
                      </p>
                    )}
                    <div className="mt-2 border-b border-gray-200 opacity-60"></div>
                  </div>
                )}
              </>
            )}

            <div>
              <Upload
                draggable
                fileList={fileList}
                onFileRemove={handleFileRemove}
                onChange={(files) => handleFileUpload(files)}
                accept=".xls,.xlsx,.csv"
                showList={true}
                multiple={false}
                uploadLimit={1}
                loading={uploading}
              >
                <div className="my-16 text-center">
                  <div className="mb-4 flex justify-center text-6xl">
                    <ApolloIcon name="file" />
                  </div>
                  <p className="font-semibold">
                    <span className="text-moss-1">Drop your file here, or </span>
                    <span className="text-ocean-2">browse</span>
                  </p>
                  <p className="mt-1 opacity-60">Support: xls, xlsx, csv</p>
                </div>
              </Upload>
            </div>

            <div className="pb-2">
              <div className="flex justify-end">
                <Button
                  variant="solid"
                  size="md"
                  disabled={
                    isSubmitting ||
                    fileList.length === 0 ||
                    importLoading ||
                    editSourcePrice ||
                    (importType === 'leads' && !selectedSourceId)
                  }
                  onClick={() => {
                    // Prevent multiple rapid clicks
                    if (isSubmitting || fileList.length === 0) return;

                    setIsSubmitting(true);
                    setUploading(true);
                    // Call the import handler
                    handleConfirmImport().finally(() => {
                      setIsSubmitting(false);
                      setUploading(false);
                      // Make sure importLoading is also reset
                      setImportLoading(false);
                    });
                  }}
                >
                  {uploading ? 'Uploading...' : isSubmitting ? 'Processing...' : 'Import'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
      {importType === 'leads' && <RecentImportDashboard extraPageSize={2} showPagination={false} />}
      {importType === 'offers' && <OffersImportHistory extraPageSize={2} showPagination={false} />}
    </div>
  );
};

export default ImportLeadDashboard;
