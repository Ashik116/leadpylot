import Button from '@/components/ui/Button';

import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import ApolloIcon from "@/components/ui/ApolloIcon";
import { useMemo } from "react";

const SuperVisorFilter = ({
    filters,
    setPageIndex,
    setFilters,
    dateRange,
}: {
    filters: any;
    setPageIndex: (pageIndex: number) => void;
    setFilters: (filters: any) => void;
    dateRange: {
        start: string;
        end: string;
    };
}) => {

    const resultOptions = useMemo(() => ([
        { value: '', label: 'All' },
        { value: 'Spy', label: 'Spy' },
        { value: 'whisper', label: 'Whisper' },
        { value: 'barge', label: 'Barge' },
        { value: 'disconnect', label: 'Disconnect' },
    ]), []);

    const isClearEnabled = (filters.action_type && filters.action_type !== '')
        || !!dateRange.start
        || !!dateRange.end;
    return (
        <div className="flex space-x-2">
            <div>
                <Select
                    options={resultOptions as any}
                    value={filters.action_type} onChange={(v: any) => { setPageIndex(1); setFilters((f: any) => ({ ...f, action_type: String(v) })); }}
                    placeholder="Action"
                />
            </div>

            <Input type="date" value={filters.start_date} onChange={(e: any) => { setPageIndex(1); setFilters((f: any) => ({ ...f, start_date: e.target.value })); }} />

            <Input type="date" value={filters.end_date} onChange={(e: any) => { setPageIndex(1); setFilters((f: any) => ({ ...f, end_date: e.target.value })); }} />

            {isClearEnabled && (
                <Button
                    variant="plain"
                    onClick={() => { setPageIndex(1); setFilters({ action_type: '', start_date: '', end_date: '' }); }}
                    className="min-w-8 "
                    disabled={!isClearEnabled}
                    icon={<ApolloIcon name="cross" />}
                >
                </Button>
            )}
        </div>
    )
}

export default SuperVisorFilter;