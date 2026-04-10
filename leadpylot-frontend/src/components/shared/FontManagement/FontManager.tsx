'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Notification from '@/components/ui/Notification';
import Dialog from '@/components/ui/Dialog';
import Tabs from '@/components/ui/Tabs';
import toast from '@/components/ui/toast';
import Upload from '@/components/ui/Upload/Upload';
import { HiUpload, HiEye, HiRefresh, HiTrash } from 'react-icons/hi';
import {
  useAvailableFonts,
  useUploadFont,
  useDeleteFont,
} from '@/services/hooks/useFontManagement';
import { FontManagementService, type FontInfo } from '@/services/FontManagementService';

interface FontManagerProps {
  onFontSelect?: (fontFamily: string) => void;
  selectedFont?: string;
  showActions?: boolean;
}

const FontManager: React.FC<FontManagerProps> = ({
  onFontSelect,
  selectedFont,
  showActions = true,
}) => {
  const [activeTab, setActiveTab] = useState('standard');
  const [previewFont, setPreviewFont] = useState<FontInfo | null>(null);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    isOpen: boolean;
    font: FontInfo | null;
  }>({
    isOpen: false,
    font: null,
  });

  const { data: availableFonts, isLoading, refetch } = useAvailableFonts();
  const uploadMutation = useUploadFont();
  const deleteMutation = useDeleteFont();

  // Load uploaded fonts as web fonts when available fonts change
  useEffect(() => {
    const loadUploadedFonts = async (uploadedFonts: FontInfo[]) => {
      for (const font of uploadedFonts) {
        setLoadedFonts((prev) => {
          if (!prev.has(font.font_family)) {
            // Load font asynchronously
            loadWebFont(font)
              .then(() => {
                setLoadedFonts((current) => new Set([...current, font.font_family]));
              })
              .catch((error) => {
                console.warn(`Failed to load font ${font.font_family}:`, error);
              });
          }
          return prev;
        });
      }
    };

    if (availableFonts?.data?.uploaded) {
      loadUploadedFonts(availableFonts?.data?.uploaded);
    }
  }, [availableFonts?.data?.uploaded]); // Only depend on the uploaded fonts data

  const loadWebFont = (font: FontInfo): Promise<void> => {
    return new Promise((resolve) => {
      // For uploaded fonts, extract filename from file_path
      let filename = '';
      if (font?.file_path) {
        filename = font?.file_path?.split('/')?.pop() || '';
      }

      // Create font face CSS - only for uploaded fonts
      if (!filename || font?.type !== 'uploaded') {
        resolve(); // Skip loading for system/standard fonts
        return;
      }

      const fontUrl = `/public/fonts/${filename}`;

      // Debug: font loading attempt

      // Determine font format
      let format = 'woff2';
      if (font?.format === 'TTF') format = 'truetype';
      else if (font?.format === 'OTF') format = 'opentype';
      else if (font?.format === 'WOFF') format = 'woff';

      const fontFace = new FontFace(font?.font_family, `url(${fontUrl})`, {
        style: 'normal',
        weight: 'normal',
      });

      fontFace
        ?.load()
        ?.then((loadedFace) => {
          document?.fonts?.add(loadedFace);
          resolve();
        })
        .catch(() => {
          // Fallback: try adding via CSS instead
          if (!document.getElementById(`font-${font?.font_family}`)) {
            const style = document?.createElement('style');
            style.id = `font-${font?.font_family}`;
            style.textContent = `
            @font-face {
              font-family: '${font?.font_family}';
              src: url('${fontUrl}') format('${format}');
              font-display: swap;
            }
          `;
            document?.head?.appendChild(style);
          }
          resolve(); // Still resolve to mark as "loaded"
        });
    });
  };

  // const handleFileSelect = (files: File[]) => {
  //   if (!files || files.length === 0) return;

  //   setUploadedFiles(files);
  // };

  const handleUploadStart = async () => {
    if (!uploadedFiles || uploadedFiles?.length === 0) return;

    const uploadResults: { success: boolean; name: string; error?: string }[] = [];

    // Upload all fonts sequentially
    for (let i = 0; i < uploadedFiles?.length; i++) {
      const file = uploadedFiles[i];

      try {
        const response = await uploadMutation.mutateAsync(file);

        if (response.success) {
          uploadResults.push({
            success: true,
            name: response?.data?.name || file?.name,
          });
          setUploadDialog(false);
        } else {
          uploadResults.push({
            success: false,
            name: file?.name,
            error: response?.error,
          });
        }
      } catch (error: any) {
        uploadResults.push({
          success: false,
          name: file?.name,
          error: error?.message,
        });
      }
    }

    // Show results
    const successCount = uploadResults?.filter((r) => r?.success)?.length;
    const failureCount = uploadResults?.filter((r) => !r?.success)?.length;

    if (successCount > 0) {
      toast.push(
        <Notification title="Fonts Uploaded" type="success">
          Successfully uploaded ${successCount} of ${uploadedFiles?.length} font$
          {uploadedFiles?.length > 1 ? 's' : ''}
        </Notification>
      );
      // Refresh font list - fonts will be loaded automatically by useEffect
      refetch();
    }

    if (failureCount > 0) {
      const failedFonts = uploadResults?.filter((r) => !r?.success);
      <Notification title="Some Uploads Failed" type="danger">
        Failed to upload: ${failedFonts?.map((f) => f?.name)?.join(', ')}
      </Notification>;
    }

    // Close dialog and clear files
    setUploadDialog(false);
    setUploadedFiles([]);
  };

  const handleFontClick = (font: FontInfo) => {
    if (onFontSelect) {
      onFontSelect(font?.font_family);
    }
  };

  const handlePreview = (font: FontInfo) => {
    setPreviewFont(font);
  };

  const handleDeleteClick = (font: FontInfo) => {
    setDeleteConfirmDialog({ isOpen: true, font });
  };

  const handleDeleteConfirm = async () => {
    const { font } = deleteConfirmDialog;
    if (!font?.id) return;

    try {
      const result = await deleteMutation.mutateAsync(font?.id);

      if (result.success) {
        setDeleteConfirmDialog({ isOpen: false, font: null });
        refetch();
        // You can add a success notification here if needed
      }
    } catch (error: any) {
      // Error handling is already done by the mutation
      console.error('Delete failed:', error);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmDialog({ isOpen: false, font: null });
  };

  const renderFontCard = (font: FontInfo, index: number) => {
    const isSelected = selectedFont === font?.font_family;

    // Create a unique key that includes type, id (if available), and index to prevent duplicates
    const uniqueKey = font?.id
      ? `${font?.type}-${font?.id}-${font?.font_family}`
      : `${font?.type}-${index}-${font?.font_family}-${font?.name}`.replace(/\s+/g, '-');

    return (
      <Card
        key={uniqueKey}
        className={`relative cursor-pointer overflow-hidden bg-gradient-to-br from-blue-50 transition-all duration-200 ${
          isSelected ? 'to-green-100 shadow-xl' : 'to-blue-50 hover:bg-gray-50'
        }`}
        onClick={() => handleFontClick(font)}
      >
        {/* Selection Indicator */}
        {isSelected && (
          <div className="bg-rust absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full">
            <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}

        <div className="p-2">
          {/* Header */}
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1 pr-2">
              <h4 className="truncate text-base font-semibold text-gray-900" title={font?.name}>
                {font?.name}
              </h4>
              <p className="truncate font-mono text-xs text-gray-500">{font?.font_family}</p>
            </div>
            <div
              className={`shrink-0 self-start rounded-full px-2 py-1 text-xs font-medium whitespace-nowrap ${
                font?.type === 'standard'
                  ? 'border border-emerald-200 bg-emerald-100 text-emerald-800'
                  : font?.type === 'system'
                    ? 'border border-blue-200 bg-blue-100 text-blue-800'
                    : 'border border-purple-200 bg-purple-100 text-purple-800'
              }`}
            >
              {font?.type}
            </div>
          </div>

          {/* Font Preview */}
          <div className="mb-2">
            <div
              className={`rounded-lg border-2 p-2 text-sm leading-relaxed transition-colors ${
                isSelected ? 'border-blue-200 bg-white shadow-sm' : 'border-gray-200 bg-gray-50'
              }`}
              style={{ fontFamily: font?.font_family }}
            >
              {font?.type === 'uploaded' && !loadedFonts.has(font?.font_family) ? (
                <div className="text-center text-gray-600">
                  <div className="mb-1 text-xs font-semibold tracking-wide text-purple-600 uppercase">
                    Loading Font: {font?.font_family}
                  </div>
                  <div className="text-xs text-gray-500">
                    <span className="mr-1 inline-block animate-spin">⏳</span>
                    Loading preview...
                  </div>
                </div>
              ) : (
                <>
                  <div className="line-clamp-1 text-base text-gray-800">The quick brown fox</div>
                  <div className="line-clamp-1 text-sm text-gray-600">jumps over the lazy dog</div>
                  <div className="mt-1 line-clamp-1 font-mono text-xs text-gray-500">
                    1234567890
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Font Info */}

          {/* Actions */}
          {showActions && (
            <div className="flex items-center justify-between">
              {font?.file_size && (
                <div className="mb-3 flex items-center gap-3 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{FontManagementService.formatFileSize(font.file_size)}</span>
                  </div>
                  {font?.format && (
                    <div className="flex items-center gap-1">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{font?.format}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="space-x-2">
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1 text-xs"
                  icon={<HiEye />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(font);
                  }}
                >
                  view
                </Button>
                {font?.type === 'uploaded' && font?.id && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="px-2 text-xs"
                    icon={<HiTrash />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(font);
                    }}
                    title="Delete font"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  };

  const tabList = [
    {
      value: 'standard',
      label: `📚 Standard (${availableFonts?.data?.standard?.length || 0})`,
      description: 'Built-in PDF fonts',
    },
    {
      value: 'system',
      label: `💻 System (${availableFonts?.data?.system?.length || 0})`,
      description: 'Fonts from your computer',
    },
    {
      value: 'uploaded',
      label: `☁️ Uploaded (${availableFonts?.data?.uploaded?.length || 0})`,
      description: 'Custom uploaded fonts',
    },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-1">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">🎨 Font Management</h3>
            <p className="ml-9 text-gray-600">• Total : {availableFonts?.data?.total || 0}</p>
          </div>

          <div className="mr-4 flex gap-3">
            <Button
              variant="default"
              icon={<HiRefresh />}
              onClick={() => refetch()}
              loading={isLoading}
              className="border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button variant="secondary" icon={<HiUpload />} onClick={() => setUploadDialog(true)}>
              Upload Font
            </Button>
          </div>
        </div>
      </div>

      {/* Font Categories */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-white shadow-sm">
        <Tabs value={activeTab} onChange={setActiveTab} className="flex h-full min-h-0 flex-col">
          <Tabs.TabList className="shrink-0 rounded-t-lg border-b border-gray-200 bg-gray-50">
            {tabList?.map((tab) => (
              <Tabs.TabNav
                key={tab.value}
                value={tab.value}
                className="relative px-6 py-4 text-sm font-medium hover:bg-gray-100 data-[selected]:border-b-2 data-[selected]:border-blue-500 data-[selected]:bg-white data-[selected]:text-blue-600"
              >
                <div className="text-center">
                  <div>{tab.label}</div>
                  <div className="mt-1 text-xs text-gray-500">{tab.description}</div>
                </div>
              </Tabs.TabNav>
            ))}
          </Tabs.TabList>

          <div className="flex-1 overflow-auto p-6">
            <Tabs.TabContent value="standard" className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {availableFonts?.data?.standard?.map((font, index) => renderFontCard(font, index))}
              </div>
            </Tabs.TabContent>

            <Tabs.TabContent value="system" className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {availableFonts?.data?.system?.map((font, index) => renderFontCard(font, index))}
              </div>
            </Tabs.TabContent>

            <Tabs.TabContent value="uploaded" className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {availableFonts?.data?.uploaded && availableFonts?.data?.uploaded?.length > 0 ? (
                  availableFonts?.data?.uploaded?.map((font, index) => renderFontCard(font, index))
                ) : (
                  <div className="col-span-full">
                    <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-center">
                      <div className="mx-auto max-w-sm">
                        <HiUpload className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                        <h3 className="mb-2 text-lg font-medium text-gray-900">No Custom Fonts</h3>
                        <p className="mb-6 text-gray-500">
                          Upload TTF, OTF, WOFF, or WOFF2 font files to use custom fonts like
                          Allianz Neo in your PDFs.
                        </p>
                        <Button
                          variant="solid"
                          icon={<HiUpload />}
                          onClick={() => setUploadDialog(true)}
                          className="bg-blue-500 hover:bg-blue-600"
                        >
                          Upload Your First Font
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Tabs.TabContent>
          </div>
        </Tabs>
      </div>

      {/* Upload Dialog */}
      <Dialog isOpen={uploadDialog} onClose={() => setUploadDialog(false)}>
        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-gray-900 select-none">Upload Custom Font</h3>
          <Upload
            draggable
            multiple
            accept=".ttf,.otf,.woff,.woff2"
            fileList={uploadedFiles}
            onChange={setUploadedFiles} // Just update the file list, don't upload yet
            onFileRemove={setUploadedFiles}
            loading={uploadMutation.isPending}
            maxFileSize={10 * 1024 * 1024} // 10MB
            uploadLimit={10} // Allow up to 10 fonts at once
            className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 p-4 text-center transition-colors hover:bg-blue-100"
            beforeUpload={(fileList) => {
              if (!fileList) return false;

              // Validate each font file
              for (const file of Array.from(fileList)) {
                const validation = FontManagementService.validateFontFile(file);
                if (!validation.valid) {
                  return validation.error || 'Invalid font file format';
                }
              }
              return true;
            }}
          >
            <div className="space-y-4">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-200">
                <HiUpload className="h-10 w-10 text-blue-600" />
              </div>

              <div>
                <div className="mb-2 text-lg font-medium text-gray-900">
                  {uploadMutation.isPending ? 'Uploading fonts...' : 'Upload Font Files'}
                </div>
                <p className="text-sm text-gray-600">
                  Choose files or drag and drop multiple font files here
                </p>
              </div>

              <div className="rounded-lg border border-blue-200 bg-white p-3">
                <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-400"></span>
                    <span>TTF</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-400"></span>
                    <span>OTF</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-400"></span>
                    <span>WOFF</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-400"></span>
                    <span>WOFF2</span>
                  </div>
                  <div className="text-gray-400">•</div>
                  <span>Max 10MB each</span>
                </div>
              </div>
            </div>
          </Upload>

          <div className="flex items-center justify-between gap-3 border-t pt-2">
            <div className="text-sm text-gray-600">
              {uploadedFiles?.length > 0 && (
                <span>
                  {uploadedFiles?.length} font{uploadedFiles?.length > 1 ? 's' : ''} ready to upload
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="default" onClick={() => setUploadDialog(false)}>
                Cancel
              </Button>
              {uploadedFiles?.length > 0 && (
                <Button
                  variant="secondary"
                  onClick={handleUploadStart}
                  loading={uploadMutation.isPending}
                  icon={<HiUpload />}
                >
                  {uploadMutation.isPending
                    ? 'Uploading...'
                    : `Upload ${uploadedFiles?.length} Font${uploadedFiles?.length > 1 ? 's' : ''}`}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Dialog>

      {/* Preview Dialog */}
      {previewFont && (
        <Dialog isOpen={!!previewFont} onClose={() => setPreviewFont(null)}>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Font Preview</h3>
              <p className="text-gray-600">{previewFont?.name}</p>
            </div>

            <div className="space-y-4">
              {previewFont?.type === 'uploaded' && !loadedFonts.has(previewFont?.font_family) ? (
                <div className="rounded-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 p-8 text-center">
                  <div className="mb-6">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
                      <span className="animate-spin text-2xl">⏳</span>
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-purple-900">
                      Loading Font Preview
                    </h3>
                    <p className="mb-4 text-sm text-purple-700">
                      Loading &quot;{previewFont?.font_family}&quot; for preview...
                    </p>
                  </div>

                  <div className="mb-4 rounded-lg border border-purple-200 bg-white p-4">
                    <div className="mb-2 text-sm text-gray-600">Font Details:</div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="font-medium text-gray-700">Format:</span>{' '}
                        {previewFont?.format}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Size:</span>{' '}
                        {FontManagementService.formatFileSize(previewFont?.file_size || 0)}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-purple-100 p-3 text-sm text-purple-600">
                    💡 Font will preview once loaded from server
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className="rounded border bg-gray-50 p-4 text-2xl"
                    style={{ fontFamily: previewFont?.font_family }}
                  >
                    The quick brown fox jumps over the lazy dog
                  </div>

                  <div
                    className="rounded border bg-gray-50 p-4 text-lg"
                    style={{ fontFamily: previewFont?.font_family }}
                  >
                    ABCDEFGHIJKLMNOPQRSTUVWXYZ
                    <br />
                    abcdefghijklmnopqrstuvwxyz
                    <br />
                    1234567890 !@#$%^&*()
                  </div>

                  <div
                    className="rounded border bg-gray-50 p-4 text-sm"
                    style={{ fontFamily: previewFont?.font_family }}
                  >
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                    incididunt ut labore et dolore magna aliqua.
                  </div>

                  {previewFont?.type === 'uploaded' && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <span>✅</span>
                        <span>
                          Custom font &quot;{previewFont?.font_family}&quot; loaded successfully
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="default" onClick={() => setPreviewFont(null)}>
                Close
              </Button>
              {onFontSelect && (
                <Button
                  variant="solid"
                  onClick={() => {
                    handleFontClick(previewFont);
                    setPreviewFont(null);
                  }}
                >
                  Select Font
                </Button>
              )}
            </div>
          </div>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmDialog?.isOpen && deleteConfirmDialog?.font && (
        <Dialog isOpen={deleteConfirmDialog?.isOpen} onClose={handleDeleteCancel}>
          <div className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <HiTrash className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Font</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="mb-2 text-gray-700">Are you sure you want to delete the font:</p>
              <div className="rounded-lg border bg-gray-50 p-3">
                <div className="font-medium text-gray-900">{deleteConfirmDialog?.font?.name}</div>
                <div className="text-sm text-gray-600">
                  Font Family: {deleteConfirmDialog?.font?.font_family}
                </div>
                {deleteConfirmDialog?.font?.file_size && (
                  <div className="mt-1 text-xs text-gray-500">
                    Size:{' '}
                    {FontManagementService.formatFileSize(deleteConfirmDialog?.font?.file_size)}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="default"
                onClick={handleDeleteCancel}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
                icon={deleteMutation.isPending ? undefined : <HiTrash />}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Font'}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default FontManager;
