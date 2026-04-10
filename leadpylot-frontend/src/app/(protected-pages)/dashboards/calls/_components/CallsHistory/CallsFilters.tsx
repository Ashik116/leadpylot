import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import ApolloIcon from "@/components/ui/ApolloIcon";
import { useMemo } from "react";

type TCallsFiltersProps = {
    setSearchTerm: (value: string) => void;
    filters: any;
    handleDispositionFilter: (value: string) => void;
    dateRange: {
        start: string;
        end: string;
    };
    setDateRange: (value: { start: string; end: string }) => void;
    clearFilters: () => void;
    handleDateRangeChange: (start: string, end: string) => void;
}

const CallsFilters = ({
    setSearchTerm,
    filters,
    handleDispositionFilter,
    dateRange,
    setDateRange,
    clearFilters,
    handleDateRangeChange,
}: TCallsFiltersProps) => {

    const resultOptions = useMemo(() => ([
        { value: 'all', label: 'All Results' },
        { value: 'ANSWERED', label: 'Answered' },
        { value: 'NO ANSWER', label: 'No Answer' },
        { value: 'BUSY', label: 'Busy' },
        { value: 'FAILED', label: 'Failed' },
    ]), []);

    const selectedResultOption = resultOptions.find(opt => opt.value === (filters.disposition || 'all')) || resultOptions[0];

    const isClearEnabled = (filters.disposition && filters.disposition !== 'all')
        || !!dateRange.start
        || !!dateRange.end;
    return (
        <div className="flex space-x-1">
            <div className="[&_.select-control]:rounded-sm">
                <Select
                    options={resultOptions as any}
                    value={selectedResultOption as any}
                    onChange={(option: any) => handleDispositionFilter(option?.value || 'all')}
                    placeholder="Result"
                    size="xs"

                />
            </div>
            <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => handleDateRangeChange(e.target.value, dateRange.end)}
                placeholder="From"
                size="xs"
                className="rounded-sm
                "
            />
            <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => handleDateRangeChange(dateRange.start, e.target.value)}
                placeholder="To"
                size="xs"
                className="rounded-md"
            />
            {/* clear */}
            {isClearEnabled ? (
                <Button
                    variant="plain"
                    size="xs"
                    onClick={() => {
                        setSearchTerm('');
                        setDateRange({ start: '', end: '' });
                        clearFilters();
                    }}
                    className="min-w-8 "
                    disabled={!isClearEnabled}
                    icon={<ApolloIcon name="cross" />}
                >
                </Button>
            ) : ''}

        </div>
    )
}
export default CallsFilters;