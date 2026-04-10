import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

// Extend dayjs with UTC plugin
dayjs.extend(utc);

export enum DateFormatType {
  SHOW_TIME = 'showTime', // "Aug 11, 2025, 11:11:25 AM"
  SHOW_DATE = 'showDate', // "Aug 11, 2025"
  SHOW_YEAR = 'showYear', // "2025"
  SHOW_MONTH_YEAR = 'showMonthYear', // "Aug 2025"
  SHOW_DAY_MONTH = 'showDayMonth', // "Aug 11"
}

export function dateFormateUtils(
  inputDate: string | undefined | null,
  formatType: DateFormatType = DateFormatType.SHOW_DATE
): string {
  if (!inputDate) return 'N/A';

  // Use UTC mode to prevent timezone-related date shifts
  const date = dayjs.utc(inputDate);

  switch (formatType) {
    case DateFormatType.SHOW_TIME:
      return date.format('MMM D, YYYY, h:mm:ss A');
    case DateFormatType.SHOW_DATE:
      return date.format('MMM D, YYYY');
    case DateFormatType.SHOW_YEAR:
      return date.format('YYYY');
    case DateFormatType.SHOW_MONTH_YEAR:
      return date.format('MMM YYYY');
    case DateFormatType.SHOW_DAY_MONTH:
      return date.format('MMM D');
    default:
      return date.format('MMM D, YYYY, h:mm:ss A');
  }
}

// Function to detect if a string is a date format and format it
export const formatGroupNameIfDate = (groupName: string): string => {
  // Check if the string matches common date formats
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
    /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
  ];

  // Check if the string matches any date pattern
  const isDate = datePatterns.some((pattern) => pattern.test(groupName));

  if (isDate) {
    // Try to parse the date and format it
    try {
      const date = dayjs.utc(groupName);
      // Check if the date is valid
      if (date.isValid()) {
        return dateFormateUtils(groupName, DateFormatType.SHOW_DATE);
      }
    } catch {
      // If parsing fails, return original string
      return groupName;
    }
  }

  // Return original string if it's not a date
  return groupName;
};
