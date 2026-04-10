#!/usr/bin/env node

/**
 * Fix Barrel File Imports
 *
 * Converts barrel imports from @/components/ui to direct imports
 * Following Vercel React Best Practices Rule 2.1
 *
 * Before:
 *   import { Button, Input, Select } from '@/components/ui';
 *
 * After:
 *   import Button from '@/components/ui/Button';
 *   import Input from '@/components/ui/Input';
 *   import Select from '@/components/ui/Select';
 */

const fs = require('fs');
const path = require('path');

/**
 * Recursively find all .ts and .tsx files in a directory
 */
function findTsFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip node_modules and hidden directories
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.') || entry.name === '.next') {
        continue;
      }
      findTsFiles(fullPath, files);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }

  return files;
}

// Component mapping from barrel exports to direct import paths
const COMPONENT_MAP = {
  // Default exports
  Alert: './Alert',
  Avatar: './Avatar',
  Badge: './Badge',
  Button: './Button',
  Calendar: './Calendar',
  Card: './Card',
  Checkbox: './Checkbox',
  CheckboxOptionCard: './CheckboxOptionCard',
  ConfigProvider: './ConfigProvider',
  DatePicker: './DatePicker',
  Dialog: './Dialog',
  Drawer: './Drawer',
  Dropdown: './Dropdown',
  Form: './Form/Form',
  FormItem: './Form/FormItem',
  FormContainer: './Form/FormContainer',
  Input: './Input',
  InputGroup: './InputGroup',
  Menu: './Menu',
  MenuItem: './MenuItem',
  Notification: './Notification',
  Pagination: './Pagination',
  Popover: './Popover',
  Progress: './Progress',
  Radio: './Radio',
  RangeCalendar: './RangeCalendar',
  ScrollBar: './ScrollBar',
  Segment: './Segment',
  Select: './Select',
  Skeleton: './Skeleton',
  Spinner: './Spinner',
  Steps: './Steps',
  Switcher: './Switcher',
  Table: './Table',
  Tabs: './Tabs',
  Tag: './Tag',
  TimeInput: './TimeInput',
  Timeline: './Timeline',
  toast: './toast',
  Tooltip: './Tooltip',
  Upload: './Upload',
  AgentSelectionDialog: './AgentSelectionDialog',
  AgentEditDialog: './AgentEditDialog',

  // Type imports (will be converted to 'import type { ... } from ...')
  AlertProps: { path: './Alert', isType: true },
  AvatarProps: { path: './Avatar', isType: true },
  AvatarGroupProps: { path: './Avatar', isType: true },
  BadgeProps: { path: './Badge', isType: true },
  ButtonProps: { path: './Button', isType: true },
  CalenderProps: { path: './Calendar', isType: true },
  CardProps: { path: './Card', isType: true },
  CheckboxProps: { path: './Checkbox', isType: true },
  CheckboxGroupProps: { path: './Checkbox', isType: true },
  CheckboxGroupValue: { path: './Checkbox', isType: true },
  CheckboxValue: { path: './Checkbox', isType: true },
  CheckboxOptionCardProps: { path: './CheckboxOptionCard', isType: true },
  Config: { path: './ConfigProvider', isType: true },
  DatePickerProps: { path: './DatePicker', isType: true },
  DatePickerRangeProps: { path: './DatePicker', isType: true },
  DateTimepickerProps: { path: './DatePicker', isType: true },
  DialogProps: { path: './Dialog', isType: true },
  DrawerProps: { path: './Drawer', isType: true },
  DropdownProps: { path: './Dropdown', isType: true },
  DropdownRef: { path: './Dropdown', isType: true },
  DropdownItemProps: { path: './Dropdown', isType: true },
  DropdownMenuProps: { path: './Dropdown', isType: true },
  FormProps: { path: './Form', isType: true },
  FormContainerProps: { path: './Form', isType: true },
  FormItemProps: { path: './Form', isType: true },
  InputProps: { path: './Input', isType: true },
  InputGroupProps: { path: './InputGroup', isType: true },
  AddonProps: { path: './InputGroup', isType: true },
  MenuProps: { path: './Menu', isType: true },
  MenuCollapseProps: { path: './Menu', isType: true },
  MenuGroupProps: { path: './Menu', isType: true },
  MenuItemProps: { path: './Menu', isType: true },
  BaseMenuItemProps: { path: './MenuItem', isType: true },
  NotificationProps: { path: './Notification', isType: true },
  PaginationProps: { path: './Pagination', isType: true },
  PopoverProps: { path: './Popover', isType: true },
  ProgressProps: { path: './Progress', isType: true },
  RadioProps: { path: './Radio', isType: true },
  RangeCalendarProps: { path: './RangeCalendar', isType: true },
  ScrollBarProps: { path: './ScrollBar', isType: true },
  ScrollBarRef: { path: './ScrollBar', isType: true },
  SegmentProps: { path: './Segment', isType: true },
  SegmentItemProps: { path: './Segment', isType: true },
  SelectProps: { path: './Select', isType: true },
  SkeletonProps: { path: './Skeleton', isType: true },
  SpinnerProps: { path: './Spinner', isType: true },
  StepsProps: { path: './Steps', isType: true },
  StepItemProps: { path: './Steps', isType: true },
  SwitcherProps: { path: './Switcher', isType: true },
  TableProps: { path: './Table', isType: true },
  TBodyProps: { path: './Table', isType: true },
  TFootProps: { path: './Table', isType: true },
  THeadProps: { path: './Table', isType: true },
  TdProps: { path: './Table', isType: true },
  ThProps: { path: './Table', isType: true },
  TrProps: { path: './Table', isType: true },
  SorterProps: { path: './Table', isType: true },
  TabsProps: { path: './Tabs', isType: true },
  TabContentProps: { path: './Tabs', isType: true },
  TabListProps: { path: './Tabs', isType: true },
  TabNavProps: { path: './Tabs', isType: true },
  TagProps: { path: './Tag', isType: true },
  TimeInputProps: { path: './TimeInput', isType: true },
  TimeInputRangeProps: { path: './TimeInput', isType: true },
  TimelineProps: { path: './Timeline', isType: true },
  TimeLineItemProps: { path: './Timeline', isType: true },
  ToastProps: { path: './toast', isType: true },
  TooltipProps: { path: './Tooltip', isType: true },
  UploadProps: { path: './Upload', isType: true },
  AgentSelectionDialogProps: { path: './AgentSelectionDialog', isType: true },
  AgentEditDialogProps: { path: './AgentEditDialog', isType: true },
  AgentEditFormData: { path: './AgentEditDialog', isType: true },
};

// Special case: hooks
const HOOKS_EXPORT = 'hooks';

const srcDir = path.join(__dirname, '../src');

/**
 * Parse import statement and extract imported names
 */
function parseBarrelImport(content) {
  const regex = /import\s+(?:(type)\s+)?\{([^}]+)\}\s+from\s+['"]@\/components\/ui['"]/g;
  const matches = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    const isTypeImport = match[1] === 'type';
    const importsStr = match[2];
    const imports = importsStr
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    matches.push({
      fullMatch: match[0],
      index: match.index,
      isTypeImport,
      imports
    });
  }

  return matches;
}

/**
 * Get the direct import path for a component name
 */
function getDirectImportName(name) {
  const mapping = COMPONENT_MAP[name];

  if (!mapping) {
    return null;
  }

  if (typeof mapping === 'string') {
    return { name, path: mapping, isType: false };
  }

  return { name, path: mapping.path, isType: mapping.isType || false };
}

/**
 * Group imports by their target file path
 */
function groupImportsByPath(imports) {
  const groups = new Map();

  for (const imp of imports) {
    const directImport = getDirectImportName(imp);

    if (!directImport) {
      console.warn(`Unknown component: ${imp}`);
      continue;
    }

    const key = directImport.path;

    if (!groups.has(key)) {
      groups.set(key, {
        path: directImport.path,
        defaultImports: [],
        typeImports: []
      });
    }

    const group = groups.get(key);

    // Determine if this should be a type import
    // Priority: explicit type import > mapping definition > original import type
    const isType = directImport.isType;

    if (isType) {
      group.typeImports.push(directImport.name);
    } else {
      // Check if the component has a default export
      group.defaultImports.push(directImport.name);
    }
  }

  return groups;
}

/**
 * Convert barrel imports to direct imports
 */
function convertImports(content) {
  const barrelImports = parseBarrelImport(content);

  if (barrelImports.length === 0) {
    return content;
  }

  let newContent = content;
  let offset = 0;

  // Process each barrel import statement
  for (const barrelImport of barrelImports) {
    const groups = groupImportsByPath(barrelImport.imports);

    if (groups.size === 0) {
      continue;
    }

    // Build the replacement imports
    const newImports = [];

    for (const [path, group] of groups) {
      // Default exports (Button, Input, etc.)
      for (const name of group.defaultImports) {
        newImports.push(`import ${name} from '@/components/ui${path.substring(1)}';`);
      }

      // Type exports
      if (group.typeImports.length > 0) {
        const typeNames = group.typeImports.join(', ');
        newImports.push(`import type { ${typeNames} } from '@/components/ui${path.substring(1)}';`);
      }
    }

    // Replace the original import with new imports
    const replacement = newImports.join('\n');
    const startPos = barrelImport.index + offset;
    const endPos = startPos + barrelImport.fullMatch.length;

    newContent =
      newContent.substring(0, startPos) +
      replacement +
      newContent.substring(endPos);

    // Update offset for next replacement
    offset += replacement.length - barrelImport.fullMatch.length;
  }

  return newContent;
}

/**
 * Clean up double semicolons that may have been introduced
 */
function cleanDoubleSemicolons(content) {
  return content.replace(/;;+/g, ';');
}

/**
 * Process a single file
 */
function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  let newContent = convertImports(content);
  newContent = cleanDoubleSemicolons(newContent);

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    return true;
  }

  return false;
}

/**
 * Main function
 */
function main() {
  const files = findTsFiles(srcDir);

  let changedCount = 0;
  let totalCount = 0;

  console.log(`Scanning ${files.length} files...\n`);

  for (const file of files) {
    // Skip the index.ts file itself (the barrel file)
    if (file.endsWith(path.join('components', 'ui', 'index.ts'))) {
      continue;
    }

    totalCount++;

    try {
      if (processFile(file)) {
        changedCount++;
        console.log(`✓ Updated: ${path.relative(srcDir, file)}`);
      }
    } catch (error) {
      console.error(`✗ Error processing ${file}:`, error.message);
    }
  }

  console.log(`\n========================================`);
  console.log(`Summary:`);
  console.log(`  Scanned: ${totalCount} files`);
  console.log(`  Updated: ${changedCount} files`);
  console.log(`  Skipped: ${totalCount - changedCount} files`);
  console.log(`========================================`);
}

main();
