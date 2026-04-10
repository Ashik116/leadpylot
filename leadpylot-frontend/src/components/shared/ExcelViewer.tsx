'use client';
import { useEffect, useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import AxiosBase from '@/services/axios/AxiosBase';
import DataTable, { ColumnDef } from '@/components/shared/DataTable';
import Spinner from '@/components/ui/Spinner';

interface ExcelViewerProps {
  downloadUrl: string;
  title?: string;
}

interface ExcelData {
  headers: string[];
  rows: any[][];
}

// Define column width mapping based on header names
const COLUMN_WIDTH_MAP: Record<string, number> = {
  'CONTACT NAME': 180,
  EMAIL: 220,
  PHONE: 150,
  ADDRESS: 250,
  CITY: 120,
  STATE: 80,
  ZIP: 80,
  COUNTRY: 120,
  'EXPECTED REVENUE': 150,
  // Add more mappings as needed
};

// Default width for columns not in the mapping
const DEFAULT_COLUMN_WIDTH = 150;

const ExcelViewer: React.FC<ExcelViewerProps> = ({ downloadUrl, title }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const fetchExcelFile = async () => {
      if (!downloadUrl) {
        setError('No download URL provided');
        setLoading(false);
        return;
      }

      try {
        // For file downloads, we need to use AxiosBase directly to get the response with blob data
        const response = await AxiosBase({
          url: downloadUrl,
          method: 'GET',
          responseType: 'blob',
        });

        // Get the blob from the response
        const blob = new Blob([response?.data], {
          type: response?.headers['content-type'] || 'application/octet-stream',
        });

        // Read the Excel file using XLSX
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook?.SheetNames[0];
            const worksheet = workbook?.Sheets[sheetName];

            // Convert the worksheet to JSON
            const jsonData = XLSX?.utils?.sheet_to_json(worksheet, { header: 1 });

            // Extract headers and rows
            const headers = jsonData?.[0] as string[];

            // Filter out empty rows (rows where all cells are empty or undefined)
            const filteredRows = (jsonData?.slice(1) as any[][])?.filter((row) => {
              // Check if the row has at least one non-empty value
              return row?.some((cell) => {
                // Handle different types of empty values including whitespace-only strings
                if (cell === undefined || cell === null) return false;
                if (typeof cell === 'string' && cell?.trim() === '') return false;
                return true;
              });
            });

            setExcelData({ headers, rows: filteredRows });
            setLoading(false);
          } catch {
            setError('Failed to parse Excel file');
            setLoading(false);
          }
        };

        reader.onerror = () => {
          setError('Failed to read Excel file');
          setLoading(false);
        };

        reader.readAsBinaryString(blob);
      } catch {
        setError('Failed to fetch Excel file');
        setLoading(false);
      }
    };

    fetchExcelFile();
  }, [downloadUrl]);

  // Transform the Excel data into a format suitable for DataTable
  const tableData = useMemo(() => {
    if (!excelData) return [];

    // Convert each row to an object with header keys
    return excelData?.rows?.map((row) => {
      const rowObj: Record<string, any> = {};
      excelData?.headers?.forEach((header, index) => {
        // Handle different types of empty values
        const value = row[index];
        rowObj[header] = value !== undefined && value !== null && value !== '' ? value : '';
      });
      return rowObj;
    });
  }, [excelData]);

  // Get column width based on header name
  const getColumnWidth = (header: string): number => {
    // Check for exact match
    if (COLUMN_WIDTH_MAP[header]) {
      return COLUMN_WIDTH_MAP[header];
    }

    // Check for case-insensitive match
    const upperHeader = header?.toUpperCase();
    for (const key in COLUMN_WIDTH_MAP) {
      if (key.toUpperCase() === upperHeader) {
        return COLUMN_WIDTH_MAP[key];
      }
    }

    // Return default width if no match found
    return DEFAULT_COLUMN_WIDTH;
  };

  // Create columns for DataTable
  const columns = useMemo(() => {
    if (!excelData) return [];

    return excelData?.headers?.map(
      (header): ColumnDef<any> => ({
        header: header,
        accessorKey: header,
        enableSorting: false, // Disable sorting for all columns
        size: getColumnWidth(header),
        cell: (info) => (
          <div className="text-nowrap text-sm">
            {info?.getValue() !== null ? String(info?.getValue()) : ''}
          </div>
        ),
      })
    );
  }, [excelData]);

  // Handle pagination change
  const handlePaginationChange = (page: number) => {
    setPageIndex(page);
  };

  // Handle page size change
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPageIndex(1); // Reset to first page when changing page size
  };

  // Calculate total pages
  const totalRows = tableData?.length;
  // const totalPages = Math.ceil(totalRows / pageSize);

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Spinner size={40} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!excelData || excelData?.rows?.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <p>No data available</p>
      </div>
    );
  }

  // Calculate the slice of data to show based on current page and page size
  const startIndex = (pageIndex - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, tableData?.length);
  const currentPageData = tableData?.slice(startIndex, endIndex);

  return (
    <div className="w-full">
      {title && <h3 className="mb-4 text-lg font-semibold">{title}</h3>}
      <DataTable
        columns={columns}
        data={currentPageData}
        pagingData={{
          total: totalRows,
          pageIndex: pageIndex,
          pageSize: pageSize,
        }}
        onPaginationChange={handlePaginationChange}
        onSelectChange={handlePageSizeChange}
        pageSizes={[10, 25, 50, 100]}
        hoverable
        compact={false}
        rowClassName="text-sm"
      />
    </div>
  );
};

export default ExcelViewer;
