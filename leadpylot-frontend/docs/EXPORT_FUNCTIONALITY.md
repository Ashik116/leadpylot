# Enhanced Export Functionality

## Overview

The export functionality has been enhanced to provide dynamic column filtering and actual row data export. The system now supports:

1. **Real-time data filtering**: When you uncheck columns in the export dialog, the data is dynamically filtered to exclude those columns
2. **Actual row data**: Instead of just exporting IDs, the system now exports complete row data with all available fields
3. **Multiple page types**: Support for leads, projects, users, and extensible for other page types
4. **Preview functionality**: See a preview of the data that will be exported before confirming

## How It Works

### Data Flow

1. **Selection**: User selects items in the data table
2. **Data Preparation**: The system fetches actual row data from navigation stores based on selected IDs
3. **Column Selection**: User opens export dialog and selects/deselects columns
4. **Dynamic Filtering**: Data is filtered in real-time based on selected columns
5. **Export**: Filtered data is exported as CSV file

### Key Components

#### 1. Export Data Store (`src/stores/exportDataStore.ts`)

- Manages export data state
- Handles column selection
- Provides filtered data based on selected columns

#### 2. DataExchange Component (`src/components/layouts/PostLoginLayout/components/DataExchange.tsx`)

- Integrates with navigation stores to get actual row data
- Handles different page types (leads, projects, users)
- Manages export process and notifications

#### 3. ExportDialog Component (`src/components/shared/ExportDialog/ExportDialog.tsx`)

- Provides column selection interface
- Shows real-time preview of filtered data
- Displays export statistics

#### 4. Export Utils (`src/utils/exportUtils.ts`)

- Handles CSV/JSON conversion
- Manages file download
- Provides utility functions for export operations

## Supported Page Types

### Leads

- Exports all lead properties including computed fields
- Additional computed fields:
  - `stage_name`, `stage_id`
  - `status_name`, `status_code`
  - `assigned_agent_login`, `assigned_agent_role`
  - `project_name`, `project_id`

### Projects

- Exports all project properties

### Users

- Exports all user properties

### Future Support

- Reclamations
- Banks
- VoIP Servers
- Sources

## Usage

1. **Select Items**: Check the checkboxes for items you want to export
2. **Open Export Dialog**: Click the Settings dropdown and select "Export"
3. **Choose Columns**: Select/deselect columns you want to include in the export
4. **Preview Data**: Review the preview to see what will be exported
5. **Export**: Click "Export" to download the CSV file

## Features

### Dynamic Column Filtering

- When you uncheck a column, that column's data is immediately removed from the export
- Real-time preview shows exactly what will be exported
- No need to re-export if you change your mind about columns

### Data Preview

- Shows first 3 rows of filtered data
- Displays column names and values
- Shows total row count and column count

### File Management

- Automatic filename generation with date
- File size calculation and display
- Success/error notifications

### Error Handling

- Graceful handling of missing data
- User-friendly error messages
- Fallback for unsupported page types

## Technical Details

### Data Sources

The system uses navigation stores to access actual row data:

- `useLeadsNavigationStore` - for leads data
- `useProjectsNavigationStore` - for projects data
- `useUsersNavigationStore` - for users data

### Column Mapping

Columns are mapped from table definitions to actual data properties:

- System columns (checkbox, action, expander) are filtered out
- Column keys are extracted from column definitions
- Display labels are generated for better readability

### Export Formats

Currently supports:

- **CSV**: Primary format with proper escaping
- **JSON**: Alternative format for data processing
- **Excel**: Uses CSV format (can be enhanced with xlsx library)

## Future Enhancements

1. **Excel Export**: Add proper Excel (.xlsx) support using xlsx library
2. **More Formats**: Support for PDF, XML, etc.
3. **Batch Export**: Export multiple page types at once
4. **Custom Templates**: User-defined export templates
5. **Scheduled Exports**: Automated export scheduling
6. **API Integration**: Send exports to external systems

## Troubleshooting

### Common Issues

1. **No data in export**: Ensure items are selected and navigation stores have data
2. **Missing columns**: Check if columns are visible in the table
3. **Export fails**: Check browser console for errors and ensure sufficient memory

### Debug Information

The system logs detailed debug information to help troubleshoot issues:

- Selected items count
- Available columns
- Filtered data count
- Export process status
