/**
 * Utility functions for data export functionality
 */

import * as XLSX from 'xlsx-js-style';

export interface ExportOptions {
  format?: 'csv' | 'xlsx' | 'xls';
  filename?: string;
  includeHeaders?: boolean;
}

/**
 * Convert data to CSV format
 */
export const convertToCSV = (
  data: Record<string, any>[],
  options: ExportOptions = { format: 'csv' }
): string => {
  if (data.length === 0) return '';

  const { includeHeaders = true } = options;
  const headers = Object.keys(data[0]);

  let csv = '';

  // Add headers
  if (includeHeaders) {
    csv += headers.map((header) => `"${header}"`).join(',') + '\n';
  }

  // Add data rows
  data.forEach((row) => {
    const values = headers.map((header) => {
      const value = row[header];
      // Handle null, undefined, and special characters
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csv += values.join(',') + '\n';
  });

  return csv;
};

/**
 * Convert data to Excel format
 */
export const convertToExcel = (
  data: Record<string, any>[],
  options: ExportOptions = { format: 'xlsx' }
): ArrayBuffer => {
  if (data.length === 0) {
    // Create empty workbook with headers
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet([]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    return XLSX.write(workbook, {
      bookType: (options.format as XLSX.BookType) || 'xlsx',
      type: 'array',
    });
  }

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  // Write to buffer
  return XLSX.write(workbook, {
    bookType: (options.format as XLSX.BookType) || 'xlsx',
    type: 'array',
  });
};

/**
 * Convert data to JSON format
 */
export const convertToJSON = (data: Record<string, any>[]): string => {
  return JSON.stringify(data, null, 2);
};

/**
 * Download data as a file
 */
export const downloadFile = (
  content: string | ArrayBuffer,
  filename: string,
  mimeType: string
): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export data with the specified format
 */
export const exportData = (
  data: Record<string, any>[],
  tableName: string,
  options: ExportOptions = { format: 'csv' }
): void => {
  const { format = 'csv', filename, includeHeaders = true } = options;

  let content: string | ArrayBuffer;
  let mimeType: string;
  let fileExtension: string;

  switch (format) {
    case 'csv':
      content = convertToCSV(data, { includeHeaders });
      mimeType = 'text/csv';
      fileExtension = 'csv';
      break;
    case 'xlsx':
      content = convertToExcel(data, { format: 'xlsx' });
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      fileExtension = 'xlsx';
      break;
    case 'xls':
      content = convertToExcel(data, { format: 'xls' });
      mimeType = 'application/vnd.ms-excel';
      fileExtension = 'xls';
      break;

    default:
      throw new Error(`Unsupported export format: ${format}`);
  }

  const finalFilename =
    filename || `${tableName}_export_${new Date().toISOString().split('T')[0]}.${fileExtension}`;

  downloadFile(content, finalFilename, mimeType);
};

/**
 * Format column headers for better readability
 */
export const formatColumnHeader = (columnKey: string): string => {
  return columnKey
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Get file size in human readable format
 */
export const getFileSize = (content: string): string => {
  const bytes = new Blob([content]).size;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Convert Tailwind color classes to Excel RGB format
 */
const tailwindToExcelRGB = (tailwindColor: string): string => {
  const colorMap: Record<string, string> = {
    'bg-blue-200': 'BFDBFE', // Light blue
    'bg-blue-50': 'EFF6FF', // Very light blue
    'bg-indigo-200': 'C7D2FE', // Light indigo
    'bg-indigo-50': 'EEF2FF', // Very light indigo
    'bg-red-200': 'FECACA', // Light red
    'bg-red-50': 'FEF2F2', // Very light red
    'bg-red-100': 'FEE2E2', // Red for high values
    'bg-purple-200': 'E9D5FF', // Light purple
    'bg-purple-50': 'FAF5FF', // Very light purple
    'bg-teal-200': '99F6E4', // Light teal
    'bg-teal-50': 'F0FDFA', // Very light teal
    'bg-emerald-200': 'A7F3D0', // Light emerald
    'bg-emerald-50': 'ECFDF5', // Very light emerald
    'bg-orange-200': 'FED7AA', // Light orange
    'bg-orange-50': 'FFF7ED', // Very light orange
    'bg-orange-100': 'FFEDD5', // Orange for medium values
    'bg-green-200': 'BBF7D0', // Light green
    'bg-green-50': 'F0FDF4', // Very light green
    'bg-lime-200': 'D9F99D', // Light lime
    'bg-lime-50': 'F7FEE7', // Very light lime
    'bg-gray-50': 'F9FAFB', // Light gray
    'bg-gray-200': 'E5E7EB', // Gray
    'bg-yellow-200': 'FEF08A', // Light yellow (for headers)
  };
  return colorMap[tailwindColor] || 'FFFFFF';
};

/**
 * Export reporting data to Excel with merged headers, colors, and totals
 */
export const exportReportingDataToExcel = (
  data: any[],
  footerTotals: any,
  primaryGrouping: string,
  secondaryGrouping?: string,
  tertiaryGrouping?: string,
  leadType: 'all' | 'live' | 'recycle' = 'all',
  filename: string = 'reporting_export'
): void => {
  if (!data || data.length === 0) {
    return;
  }

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([]);

  // Define column structure - using same names as table component
  const getPrimaryHeader = () => {
    switch (primaryGrouping) {
      case 'agent':
        return 'AGENT';
      case 'project':
        return 'PROJECT';
      case 'status':
        return 'STATUS';
      case 'stage':
        return 'STAGE';
      default:
        return 'GROUP';
    }
  };

  const getSecondaryHeader = () => {
    if (!secondaryGrouping) return null;
    switch (secondaryGrouping) {
      case 'agent':
        return 'AGENT';
      case 'project':
        return 'PROJECT';
      case 'status':
        return 'STATUS';
      case 'stage':
        return 'STAGE';
      default:
        return 'GROUP';
    }
  };

  // Build header rows
  const headerRow1: any[] = [];
  const headerRow2: any[] = [];

  // Primary grouping column
  headerRow1.push(getPrimaryHeader());
  headerRow2.push('');

  // Secondary grouping column (if exists)
  if (secondaryGrouping) {
    headerRow1.push(getSecondaryHeader() || '');
    headerRow2.push('');
  }

  // Tertiary grouping column (if exists)
  if (tertiaryGrouping) {
    switch (tertiaryGrouping) {
      case 'agent':
        headerRow1.push('AGENT');
        break;
      case 'project':
        headerRow1.push('PROJECT');
        break;
      case 'status':
        headerRow1.push('STATUS');
        break;
      case 'stage':
        headerRow1.push('STAGE');
        break;
      default:
        headerRow1.push(tertiaryGrouping.toUpperCase());
    }
    headerRow2.push('');
  }

  // Metric columns with Live/Recycle sub-headers - using same labels as table component
  const metrics = [
    { key: 'leads', label: 'LEADS', headerColor: 'bg-blue-200', bgColor: 'bg-blue-50' },
    { key: 'u_n2', label: 'U-N2', headerColor: 'bg-indigo-200', bgColor: 'bg-indigo-50' },
    { key: 'reklamation', label: 'Reklamation', headerColor: 'bg-red-200', bgColor: 'bg-red-50' },
    { key: 'angebots', label: 'Angebots', headerColor: 'bg-purple-200', bgColor: 'bg-purple-50' },
    { key: 'opening', label: 'OPENINGS', headerColor: 'bg-teal-200', bgColor: 'bg-teal-50' },
    { key: 'annahmen', label: 'ANNAHMEN', headerColor: 'bg-emerald-200', bgColor: 'bg-emerald-50' },
    { key: 'u_trager', label: 'Ü-TRÄGER', headerColor: 'bg-orange-200', bgColor: 'bg-orange-50' },
    { key: 'netto1', label: 'NETTO 1', headerColor: 'bg-green-200', bgColor: 'bg-green-50' },
    { key: 'netto2', label: 'NETTO 2', headerColor: 'bg-lime-200', bgColor: 'bg-lime-50' },
  ];

  metrics.forEach((metric) => {
    if (leadType === 'all') {
      // For 'all', add metric label to first cell, empty to second (will be merged)
      headerRow1.push(metric.label);
      headerRow1.push(''); // Empty cell for merge
      headerRow2.push('Live');
      headerRow2.push('Recycle');
    } else if (leadType === 'live') {
      headerRow1.push(metric.label);
      headerRow2.push('Live');
    } else {
      headerRow1.push(metric.label);
      headerRow2.push('Recycle');
    }
  });

  // Add header rows to worksheet
  XLSX.utils.sheet_add_aoa(worksheet, [headerRow1, headerRow2], { origin: 'A1' });

  // Merge header cells for metrics
  if (!worksheet['!merges']) worksheet['!merges'] = [];
  let colIndex = (secondaryGrouping ? 1 : 0) + (tertiaryGrouping ? 1 : 0) + 1; // Start after grouping columns

  metrics.forEach((metric) => {
    const startCol = colIndex;
    if (leadType === 'all') {
      colIndex += 2; // Live + Recycle
      const merges = worksheet['!merges'] || [];
      merges.push({
        s: { r: 0, c: startCol },
        e: { r: 0, c: startCol + 1 },
      });
      worksheet['!merges'] = merges;
    } else {
      colIndex += 1;
    }
  });

  // Add data rows
  data.forEach((row, rowIndex) => {
    const dataRow: any[] = [];
    const metrics = row.metrics || {};

    // Primary grouping
    dataRow.push(row.display_name || '-');

    // Secondary grouping
    if (secondaryGrouping) {
      dataRow.push(row.secondary_name || row.project || '-');
    }

    // Tertiary grouping
    if (tertiaryGrouping) {
      dataRow.push(row.tertiary_name || '-');
    }

    // Metrics
    if (leadType === 'all' || leadType === 'live') {
      dataRow.push(metrics.total_leads_live || 0);
      dataRow.push(metrics.u_n2_live || 0);
      dataRow.push(metrics.reklamation_live || 0);
      dataRow.push(metrics.total_offers_live || 0);
      dataRow.push(metrics.total_openings_live || 0);
      dataRow.push(metrics.total_payments_live || 0);
      dataRow.push(metrics.u_trager_live || 0);
      dataRow.push(metrics.total_netto1_live || 0);
      dataRow.push(metrics.netto2_live || 0);
    }

    if (leadType === 'all' || leadType === 'recycle') {
      dataRow.push(metrics.total_leads_recycle || 0);
      dataRow.push(metrics.u_n2_recycle || 0);
      dataRow.push(metrics.reklamation_recycle || 0);
      dataRow.push(metrics.total_offers_recycle || 0);
      dataRow.push(metrics.total_openings_recycle || 0);
      dataRow.push(metrics.total_payments_recycle || 0);
      dataRow.push(metrics.u_trager_recycle || 0);
      dataRow.push(metrics.total_netto1_recycle || 0);
      dataRow.push(metrics.netto2_recycle || 0);
    }

    XLSX.utils.sheet_add_aoa(worksheet, [dataRow], { origin: -1 });
  });

  // Add total row
  if (footerTotals) {
    const totalRow: any[] = [];
    totalRow.push('Summary'); // Total label

    // Fill grouping columns with empty
    if (secondaryGrouping) totalRow.push('');
    if (tertiaryGrouping) totalRow.push('');

    // Add totals for metrics
    if (leadType === 'all' || leadType === 'live') {
      totalRow.push(footerTotals.leads_live || 0);
      totalRow.push(footerTotals.u_n2_live || 0);
      totalRow.push(footerTotals.reklamation_live || 0);
      totalRow.push(footerTotals.offers_live || 0);
      totalRow.push(footerTotals.openings_live || 0);
      totalRow.push(footerTotals.confirmation_live || 0);
      totalRow.push(footerTotals.u_trager_live || 0);
      totalRow.push(footerTotals.netto1_live || 0);
      totalRow.push(footerTotals.netto2_live || 0);
    }

    if (leadType === 'all' || leadType === 'recycle') {
      totalRow.push(footerTotals.leads_recycle || 0);
      totalRow.push(footerTotals.u_n2_recycle || 0);
      totalRow.push(footerTotals.reklamation_recycle || 0);
      totalRow.push(footerTotals.offers_recycle || 0);
      totalRow.push(footerTotals.openings_recycle || 0);
      totalRow.push(footerTotals.confirmation_recycle || 0);
      totalRow.push(footerTotals.u_trager_recycle || 0);
      totalRow.push(footerTotals.netto1_recycle || 0);
      totalRow.push(footerTotals.netto2_recycle || 0);
    }

    XLSX.utils.sheet_add_aoa(worksheet, [totalRow], { origin: -1 });
  }

  // Set column widths
  const colWidths = [];
  const numCols = headerRow1.length;
  for (let i = 0; i < numCols; i++) {
    colWidths.push({ wch: 15 });
  }
  worksheet['!cols'] = colWidths;

  // Apply colors matching the table component
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

  // Style grouping columns (gray background)
  const groupingCols = 1 + (secondaryGrouping ? 1 : 0) + (tertiaryGrouping ? 1 : 0);
  for (let col = 0; col < groupingCols; col++) {
    // Header row (row 0) - grouping columns
    const cellAddress0 = XLSX.utils.encode_cell({ r: 0, c: col });
    if (worksheet[cellAddress0]) {
      if (!worksheet[cellAddress0].s) worksheet[cellAddress0].s = {};
      worksheet[cellAddress0].s.font = { bold: true };
      worksheet[cellAddress0].s.fill = { fgColor: { rgb: tailwindToExcelRGB('bg-gray-200') } };
      worksheet[cellAddress0].s.alignment = { horizontal: 'center', vertical: 'center' };
    }
    // Sub-header row (row 1) - grouping columns
    const cellAddress1 = XLSX.utils.encode_cell({ r: 1, c: col });
    if (worksheet[cellAddress1]) {
      if (!worksheet[cellAddress1].s) worksheet[cellAddress1].s = {};
      worksheet[cellAddress1].s.font = { bold: true };
      worksheet[cellAddress1].s.fill = { fgColor: { rgb: tailwindToExcelRGB('bg-gray-200') } };
      worksheet[cellAddress1].s.alignment = { horizontal: 'center', vertical: 'center' };
    }
  }

  // Style metric headers with their specific colors
  let metricColIndex = groupingCols;
  metrics.forEach((metric) => {
    if (leadType === 'all') {
      // Main header (row 0) - merged cell with metric color
      const headerCell = XLSX.utils.encode_cell({ r: 0, c: metricColIndex });
      if (worksheet[headerCell]) {
        if (!worksheet[headerCell].s) worksheet[headerCell].s = {};
        worksheet[headerCell].s.font = { bold: true, color: { rgb: '000000' } };
        worksheet[headerCell].s.fill = { fgColor: { rgb: tailwindToExcelRGB(metric.headerColor) } };
        worksheet[headerCell].s.alignment = { horizontal: 'center', vertical: 'center' };
      }
      // Sub-header cells (row 1) - Live and Recycle with same color
      const liveCell = XLSX.utils.encode_cell({ r: 1, c: metricColIndex });
      const recycleCell = XLSX.utils.encode_cell({ r: 1, c: metricColIndex + 1 });
      [liveCell, recycleCell].forEach((cellAddr) => {
        if (worksheet[cellAddr]) {
          if (!worksheet[cellAddr].s) worksheet[cellAddr].s = {};
          worksheet[cellAddr].s.font = { bold: true, color: { rgb: '000000' } };
          worksheet[cellAddr].s.fill = { fgColor: { rgb: tailwindToExcelRGB(metric.headerColor) } };
          worksheet[cellAddr].s.alignment = { horizontal: 'center', vertical: 'center' };
        }
      });
      metricColIndex += 2;
    } else {
      // Single column for live or recycle only
      const headerCell = XLSX.utils.encode_cell({ r: 0, c: metricColIndex });
      const subHeaderCell = XLSX.utils.encode_cell({ r: 1, c: metricColIndex });
      [headerCell, subHeaderCell].forEach((cellAddr) => {
        if (worksheet[cellAddr]) {
          if (!worksheet[cellAddr].s) worksheet[cellAddr].s = {};
          worksheet[cellAddr].s.font = { bold: true, color: { rgb: '000000' } };
          worksheet[cellAddr].s.fill = { fgColor: { rgb: tailwindToExcelRGB(metric.headerColor) } };
          worksheet[cellAddr].s.alignment = { horizontal: 'center', vertical: 'center' };
        }
      });
      metricColIndex += 1;
    }
  });

  // Style data rows with background colors matching table
  for (let rowIndex = 2; rowIndex < data.length + 2; rowIndex++) {
    let dataColIndex = groupingCols;
    metrics.forEach((metric) => {
      const row = data[rowIndex - 2];
      const metricsData = row.metrics || {};

      if (leadType === 'all' || leadType === 'live') {
        const cellAddr = XLSX.utils.encode_cell({ r: rowIndex, c: dataColIndex });
        if (worksheet[cellAddr]) {
          if (!worksheet[cellAddr].s) worksheet[cellAddr].s = {};
          const value =
            metric.key === 'leads'
              ? metricsData.total_leads_live
              : metric.key === 'u_n2'
                ? metricsData.u_n2_live
                : metric.key === 'reklamation'
                  ? metricsData.reklamation_live
                  : metric.key === 'angebots'
                    ? metricsData.total_offers_live
                    : metric.key === 'opening'
                      ? metricsData.total_openings_live
                      : metric.key === 'annahmen'
                        ? metricsData.total_payments_live
                        : metric.key === 'u_trager'
                          ? metricsData.u_trager_live
                          : metric.key === 'netto1'
                            ? metricsData.total_netto1_live
                            : metricsData.netto2_live || 0;

          // Apply conditional coloring for u_n2 and reklamation
          let bgColor = metric.bgColor;
          if ((metric.key === 'u_n2' || metric.key === 'reklamation') && value > 10) {
            bgColor = 'bg-red-100';
          } else if ((metric.key === 'u_n2' || metric.key === 'reklamation') && value > 5) {
            bgColor = 'bg-orange-100';
          }

          worksheet[cellAddr].s.fill = { fgColor: { rgb: tailwindToExcelRGB(bgColor) } };
          worksheet[cellAddr].s.alignment = { horizontal: 'center', vertical: 'center' };
        }
        dataColIndex++;
      }

      if (leadType === 'all' || leadType === 'recycle') {
        const cellAddr = XLSX.utils.encode_cell({ r: rowIndex, c: dataColIndex });
        if (worksheet[cellAddr]) {
          if (!worksheet[cellAddr].s) worksheet[cellAddr].s = {};
          const value =
            metric.key === 'leads'
              ? metricsData.total_leads_recycle
              : metric.key === 'u_n2'
                ? metricsData.u_n2_recycle
                : metric.key === 'reklamation'
                  ? metricsData.reklamation_recycle
                  : metric.key === 'angebots'
                    ? metricsData.total_offers_recycle
                    : metric.key === 'opening'
                      ? metricsData.total_openings_recycle
                      : metric.key === 'annahmen'
                        ? metricsData.total_payments_recycle
                        : metric.key === 'u_trager'
                          ? metricsData.u_trager_recycle
                          : metric.key === 'netto1'
                            ? metricsData.total_netto1_recycle
                            : metricsData.netto2_recycle || 0;

          // Apply conditional coloring for u_n2 and reklamation
          let bgColor = metric.bgColor;
          if ((metric.key === 'u_n2' || metric.key === 'reklamation') && value > 10) {
            bgColor = 'bg-red-100';
          } else if ((metric.key === 'u_n2' || metric.key === 'reklamation') && value > 5) {
            bgColor = 'bg-orange-100';
          }

          worksheet[cellAddr].s.fill = { fgColor: { rgb: tailwindToExcelRGB(bgColor) } };
          worksheet[cellAddr].s.alignment = { horizontal: 'center', vertical: 'center' };
        }
        dataColIndex++;
      }
    });
  }

  // Style total row (Summary row)
  const totalRowIndex = data.length + 2; // +2 for header rows
  for (let col = 0; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: totalRowIndex, c: col });
    if (!worksheet[cellAddress]) continue;
    if (!worksheet[cellAddress].s) worksheet[cellAddress].s = {};
    worksheet[cellAddress].s.font = { bold: true };
    if (col < groupingCols) {
      worksheet[cellAddress].s.fill = { fgColor: { rgb: tailwindToExcelRGB('bg-gray-200') } };
    } else {
      // Apply metric colors to total row
      let currentCol = groupingCols;
      for (let i = 0; i < metrics.length; i++) {
        const metric = metrics[i];
        const colsForMetric = leadType === 'all' ? 2 : 1;
        if (col >= currentCol && col < currentCol + colsForMetric) {
          worksheet[cellAddress].s.fill = { fgColor: { rgb: tailwindToExcelRGB(metric.bgColor) } };
          break;
        }
        currentCol += colsForMetric;
      }
    }
    worksheet[cellAddress].s.alignment = { horizontal: 'center', vertical: 'center' };
  }

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  // Write to buffer and download
  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
    cellStyles: true, // Enable cell styles
  });

  downloadFile(
    excelBuffer,
    `${filename}.xlsx`,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
};
