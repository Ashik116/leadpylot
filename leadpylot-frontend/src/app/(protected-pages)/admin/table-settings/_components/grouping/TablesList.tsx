'use client';

import { useState, useMemo } from 'react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import ApolloIcon from '@/components/ui/ApolloIcon';
import classNames from '@/utils/classNames';

interface TableInfo {
  tableName: string;
  label: string;
}

interface TablesListProps {
  onTableSelect?: (model: string) => void;
  selectedModel?: string;
  tablesWithColumns?: string[]; // List of table names that have at least one selected column
}

// Available tables/models
const AVAILABLE_TABLES: TableInfo[] = [
  // Lead-Offers Service (4003)
  { tableName: 'Lead', label: 'Lead' },
  { tableName: 'Offer', label: 'Offer' },
  { tableName: 'Opening', label: 'Opening' },
  { tableName: 'All', label: 'All Progress' },
  { tableName: 'Confirmation', label: 'Confirmation' },
  { tableName: 'PaymentVoucher', label: 'Payment Voucher' },
  { tableName: 'Netto1', label: 'Netto 1' },
  { tableName: 'Netto2', label: 'Netto 2' },
  { tableName: 'Lost', label: 'Lost' },
  // { tableName: 'Reclamation', label: 'Reclamation' },
  // { tableName: 'AssignLeads', label: 'Assign Leads' },
  // { tableName: 'Appointment', label: 'Appointment' },
  // { tableName: 'Todo', label: 'Todo' },
  // { tableName: 'TodoType', label: 'Todo Type' },
  // { tableName: 'Favourite', label: 'Favourite' },
  // { tableName: 'Team', label: 'Team' },
  // { tableName: 'ImportHistory', label: 'Import History' },
  // { tableName: 'OfferImportHistory', label: 'Offer Import History' },
  // { tableName: 'LeadTransfer', label: 'Lead Transfer' },
  // { tableName: 'QueueTop', label: 'Queue Top' },
  // { tableName: 'AgentQueuePosition', label: 'Agent Queue Position' },

  // Configuration Service (4006)
  { tableName: 'Bank', label: 'Bank' },
  // { tableName: 'Source', label: 'Source' },
  { tableName: 'Project', label: 'Project' },
  // { tableName: 'Assignment', label: 'Assignment' },
  // { tableName: 'ColumnPreference', label: 'Column Preference' },
  // { tableName: 'Document', label: 'Document' },

  // User-Auth Service (4000)
  // { tableName: 'User', label: 'User' },
  // { tableName: 'UserSession', label: 'User Session' },
  // { tableName: 'UserInactivity', label: 'User Inactivity' },
  // { tableName: 'Settings', label: 'Settings' },
  // { tableName: 'LoginAttempt', label: 'Login Attempt' },
  // { tableName: 'IpBlocklist', label: 'IP Blocklist' },
  // { tableName: 'DeviceBlocklist', label: 'Device Blocklist' },

  // Email Service (4008)
  // { tableName: 'Email', label: 'Email' },

  // Notification Service (4004)
  // { tableName: 'Notification', label: 'Notification' },
  // { tableName: 'NotificationReadReceipt', label: 'Notification Read Receipt' },

  // PDF Service (4009)
  // { tableName: 'PdfTemplate', label: 'PDF Template' },
  // { tableName: 'GeneratedPdf', label: 'Generated PDF' },
  // { tableName: 'Font', label: 'Font' },
].sort((a, b) => a.label.localeCompare(b.label));

const TablesList = ({ onTableSelect, selectedModel, tablesWithColumns = [] }: TablesListProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter tables based on search term
  const filteredTables = useMemo(() => {
    if (!searchTerm.trim()) {
      return AVAILABLE_TABLES;
    }

    const lowerSearchTerm = searchTerm.toLowerCase();
    return AVAILABLE_TABLES.filter(
      (table) =>
        table.label.toLowerCase().includes(lowerSearchTerm) ||
        table.tableName.toLowerCase().includes(lowerSearchTerm)
    );
  }, [searchTerm]);

  const handleTableClick = (tableName: string) => {
    if (onTableSelect) {
      onTableSelect(tableName);
    }
  };

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-center space-x-2 border-b border-gray-200 px-2 py-0.5">
        <div className="flex flex-1 items-center justify-between space-x-2">
          <Input
            placeholder="Search pages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            prefix={<ApolloIcon name="search" className="text-gray-400" />}
            className="w-full"
          />
        </div>
        {filteredTables.length > 0 && (
          <div className="rounded-md bg-blue-300/20 p-1 text-xs text-blue-700">
            {filteredTables.length} {filteredTables.length === 1 ? 'page' : 'pages'}
          </div>
        )}
      </div>
      <div
        className="flex-1 overflow-y-auto px-2 py-2"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        {filteredTables.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-gray-500">
              {searchTerm ? 'No tables found matching your search' : 'No tables found'}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTables.map((table) => {
              const isSelected = selectedModel === table.tableName;
              const hasColumns = tablesWithColumns.includes(table.tableName);

              return (
                <div
                  key={table.tableName}
                  onClick={() => handleTableClick(table.tableName)}
                  className={classNames(
                    'cursor-pointer rounded-md px-3 py-2.5 text-sm transition-colors',
                    isSelected ? 'bg-blue-50 text-blue-900' : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <ApolloIcon
                      name="heatmap"
                      className={classNames(
                        'h-4 w-4 shrink-0',
                        isSelected ? 'text-blue-600' : 'text-gray-400'
                      )}
                    />
                    <span className="flex-1 truncate font-medium">{table.label}</span>
                    {hasColumns && (
                      <ApolloIcon name="check" className="h-4 w-4 shrink-0 text-green-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};

export default TablesList;
