export type FieldType =
  | 'input'
  | 'textarea'
  | 'select'
  | 'asyncSelect'
  | 'asyncSelectSingle'
  | 'date'
  | 'datepicker'
  | 'timepicker'
  | 'color'
  | 'custom';

export interface FieldDefinition {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: string;
  // Input specific props
  inputType?: 'text' | 'number' | 'email' | 'password' | 'tel' | 'url' | 'germany' | 'date';
  step?: string | number;
  // AsyncSelect specific props
  apiUrl?: string;
  queryKey?: string;
  optLabelKey?: string;
  optValueKey?: string;
  isMulti?: boolean;
  isClearable?: boolean;
  sidebarVisible?: boolean;
  searchKey?: string;
  maxMenuHeight?: number;
  // AsyncSelect callbacks for complex interactions
  onAsyncSelectChange?: (value: any, actionMeta?: any, setValue?: (name: string, value: any) => void, onChange?: (value: any) => void, currentValue?: any) => void;
  formatOptionLabel?: (option: any) => React.ReactNode;
  customComponents?: any; // For custom MultiValue, etc.
  // Select specific props
  options?: Array<{ label: string; value: string | boolean | number }>;
  // Timepicker specific props
  timeFormat?: '12' | '24'; // Time format for timepicker (12-hour or 24-hour)
  timePrecision?: 'hour' | 'hourMinute' | 'hourMinuteSecond'; // Control which parts to show
  timeDisplayFormat?: string; // Custom display format: 'HH', 'HH:MM', 'HH:MM:SS', 'HH:00:00', etc.
  // Conditional rendering
  condition?: (values: any) => boolean;
  // Custom field rendering
  customRender?: () => React.ReactNode;
}
