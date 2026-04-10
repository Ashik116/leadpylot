'use client';

/**
 * CalendarFilterModal Component
 * Calendar view with email counts per day for date filtering
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dayjs from 'dayjs';
import Calendar from '@/components/ui/DatePicker/Calendar';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import { useEmailStore } from '../../_stores/emailStore';
import emailApiService from '../../_services/EmailApiService';
import { useSession } from '@/hooks/useSession';

interface CalendarFilterModalProps {
    onClose: () => void;
}

interface CalendarDataItem {
    date: string;
    count: number;
}

interface CalendarResponse {
    success: boolean;
    data: CalendarDataItem[];
    meta: {
        start_date: string;
        end_date: string;
        total_dates: number;
    };
}

export default function CalendarFilterModal({ onClose }: CalendarFilterModalProps) {
    const { filters, setFilters } = useEmailStore();
    const { data: session } = useSession();
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [calendarData, setCalendarData] = useState<Map<string, number>>(new Map());
    const [isLoading, setIsLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(
        filters.date_filter ? dayjs(filters.date_filter).toDate() : null
    );
    const [hoveredDate, setHoveredDate] = useState<string | null>(null);
    const isFetchingRef = useRef(false);

    // Calculate start and end dates for the current month
    const monthRange = useMemo(() => {
        const start = dayjs(currentMonth).startOf('month');
        const end = dayjs(currentMonth).endOf('month');
        return {
            startDate: start.format('YYYY-MM-DD'),
            endDate: end.format('YYYY-MM-DD'),
        };
    }, [currentMonth]);

    // Fetch calendar data when month changes
    const fetchCalendarData = useCallback(async () => {
        if (isFetchingRef.current) {
            return;
        }
        isFetchingRef.current = true;
        setIsLoading(true);
        try {
            const response = await emailApiService.getCalendarView(
                monthRange.startDate,
                monthRange.endDate
            ) as CalendarResponse;

            if (response.success && response.data) {
                const dataMap = new Map<string, number>();
                response.data.forEach((item) => {
                    dataMap.set(item.date, item.count);
                });
                setCalendarData(dataMap);
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to fetch calendar data:', error);
        } finally {
            setIsLoading(false);
            isFetchingRef.current = false;
        }
    }, [monthRange.startDate, monthRange.endDate]);

    // Fetch data when month changes
    useEffect(() => {
        fetchCalendarData();
    }, [fetchCalendarData]);

    // Handle month change
    const handleMonthChange = useCallback((month: Date) => {
        setCurrentMonth(month);
    }, []);

    // Handle day selection
    const handleDateSelect = useCallback(
        (date: Date | null) => {
            if (!date) {
                // Clear filter if date is null
                const newFilters = { ...filters };
                delete newFilters.date_filter;
                setFilters(newFilters);
                setSelectedDate(null);
                onClose();
                return;
            }

            const formattedDate = dayjs(date).format('YYYY-MM-DD');
            const isSameDate = selectedDate && dayjs(selectedDate).format('YYYY-MM-DD') === formattedDate;

            if (isSameDate) {
                // Toggle: if same date clicked, clear filter
                const newFilters = { ...filters };
                delete newFilters.date_filter;
                setFilters(newFilters);
                setSelectedDate(null);
            } else {
                // Set new date filter
                setFilters({ ...filters, date_filter: formattedDate });
                setSelectedDate(date);
            }
            onClose();
        },
        [filters, selectedDate, setFilters, onClose]
    );

    // Render day with count badge
    const renderDay = useCallback(
        (date: Date) => {
            const dateStr = dayjs(date).format('YYYY-MM-DD');
            const count = calendarData.get(dateStr) || 0;
            const dayNumber = date.getDate();

            const circleBase = 'flex h-9 w-9 items-center justify-center rounded-full text-[0.875rem] font-medium transition-all duration-200';
            const countBase = 'rounded-full px-2 py-0.5 text-[0.625rem] font-medium transition-colors duration-200';

            return (
                <div
                    className="flex h-full w-full flex-col items-center justify-center gap-1"
                    onMouseEnter={() => setHoveredDate(dateStr)}
                    onMouseLeave={() => setHoveredDate(null)}
                >
                    <span className={`${circleBase} `}>{dayNumber}</span>
                    {count > 0 && <span className={`${countBase}`}>{count}</span>}
                </div>
            );
        },
        [calendarData, hoveredDate, selectedDate]
    );

    // Clear filter handler
    const handleClearFilter = useCallback(() => {
        const newFilters = { ...filters };
        delete newFilters.date_filter;
        setFilters(newFilters);
        setSelectedDate(null);
        onClose();
    }, [filters, setFilters, onClose]);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-30 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden flex flex-col h-[48dvh]">
                {/* Header */}
                <div className="px-4 pt-2 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <ApolloIcon name="calendar" />
                                Calendar Filter
                            </h2>
                            {filters.date_filter && (
                                <div className="text-sm text-gray-600">
                                    Filtered by: <span className="font-medium">{filters.date_filter}</span>
                                </div>
                            )}
                        </div>
                        <Button
                            variant="plain"
                            size="sm"
                            onClick={onClose}
                            icon={<ApolloIcon name="cross" />}
                        />
                    </div>

                </div>

                {/* Calendar Content */}
                <div className="p-6 flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="flex flex-col items-center gap-2">
                                <ApolloIcon name="loading" className="animate-spin text-2xl text-gray-400" />
                                <span className="text-sm text-gray-500">Loading calendar data...</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-center">
                            <Calendar
                                value={selectedDate}
                                onChange={handleDateSelect}
                                onMonthChange={handleMonthChange}
                                defaultMonth={currentMonth}
                                renderDay={renderDay}
                                dayClassName={(date) => {
                                    const dateStr = dayjs(date).format('YYYY-MM-DD');
                                    return hoveredDate === dateStr ? 'hover:bg-gray-400' : '';
                                }}
                                enableHeaderLabel
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-2 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                        Click a date to filter emails
                    </div>
                    <div className="flex gap-2">
                        {filters.date_filter && (
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleClearFilter}
                                icon={<ApolloIcon name="cross" />}
                            >
                                Clear Filter
                            </Button>
                        )}
                        <Button variant="default" size="sm" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

