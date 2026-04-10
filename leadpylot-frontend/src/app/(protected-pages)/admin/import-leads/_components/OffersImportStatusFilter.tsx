'use client';

import Select from '@/components/ui/Select';
import { useSearchParams } from 'next/navigation';
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams';

const OffersImportStatusFilter = () => {
    const searchParams = useSearchParams();
    const { onAppendQueryParams } = useAppendQueryParams();
    const currentStatus = searchParams.get('status') || '';

    // Status options for filtering
    const statusOptions = [
        { value: '', label: 'All Status' },
        { value: 'completed', label: 'Completed' },
        { value: 'processing', label: 'Processing' },
        { value: 'failed', label: 'Failed' },
    ];

    return (
        <div className="w-48">
            <Select
                options={statusOptions}
                value={statusOptions.find((option) => option.value === currentStatus)}
                onChange={(option) => {
                    onAppendQueryParams({
                        status: option?.value || '',
                        pageIndex: '1', // Reset to first page when filtering
                    });
                }}
                placeholder="Filter by status"
            />
        </div>
    );
};

export default OffersImportStatusFilter; 