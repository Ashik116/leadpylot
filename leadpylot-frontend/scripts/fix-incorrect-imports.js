#!/usr/bin/env node

/**
 * Fix Incorrect Default Import Syntax
 *
 * Converts incorrect named imports to correct default imports for components
 * that use `export default`.
 *
 * Before: import { Button } from '@/components/ui/Button'
 * After:  import Button from '@/components/ui/Button'
 *
 * This is critical because importing a default export using named import syntax
 * will result in undefined values at runtime.
 */

const fs = require('fs');
const path = require('path');

// Components that use default export (based on actual file structure)
const DEFAULT_EXPORT_COMPONENTS = [
  'Button',
  'Input',
  'Select',
  'Dialog',
  'Dropdown',
  'Card',
  'Badge',
  'Avatar',
  'Checkbox',
  'Alert',
  'Notification',
  'Pagination',
  'Popover',
  'Progress',
  'Radio',
  'ScrollBar',
  'Segment',
  'Skeleton',
  'Spinner',
  'Switcher',
  'Table',
  'Tabs',
  'Tag',
  'Timeline',
  'Tooltip',
  'Upload',
  'Calendar',
  'DatePicker',
  'Drawer',
  'FormItem',
  'FormContainer',
  'Menu',
  'MenuItem',
  'Steps',
  'TimeInput',
  'RangeCalendar',
  // Add more as needed
];

/**
 * Recursively find all .ts and .tsx files in a directory
 */
function findTsFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

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

/**
 * Fix incorrect default import syntax in a file
 */
function fixIncorrectImports(content) {
  let newContent = content;
  let hasChanges = false;

  for (const component of DEFAULT_EXPORT_COMPONENTS) {
    // Match: import { Component } from '@/components/ui/Component'
    // Also handle multiple imports on same line: import { Button, Input } from ...
    const regex = new RegExp(
      `import\\s*\\{\\s*([\\w\\s,]*\\b${component}\\b[\\w\\s,]*)\\s*\\}\\s*from\\s*['"]@/components/ui/${component}['"]`,
      'g'
    );

    newContent = newContent.replace(regex, (match, importsBlock) => {
      // Get all imported names
      const imports = importsBlock
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      // Separate the component we're fixing from other imports
      const otherImports = imports.filter(i => i !== component);

      // Build the replacement
      let replacement = '';

      // Add the default import first
      replacement += `import ${component} from '@/components/ui/${component}'`;

      // Add other named imports if they exist
      if (otherImports.length > 0) {
        replacement += `\nimport { ${otherImports.join(', ')} } from '@/components/ui/${component}'`;
      }

      hasChanges = true;
      return replacement;
    });
  }

  return { content: newContent, hasChanges };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { content: newContent, hasChanges } = fixIncorrectImports(content);

  if (hasChanges) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    return true;
  }

  return false;
}

/**
 * Main function
 */
function main() {
  const srcDir = path.join(__dirname, '../src');
  const files = findTsFiles(srcDir);

  let changedCount = 0;

  console.log(`Scanning ${files.length} files for incorrect default imports...\n`);

  for (const file of files) {
    try {
      if (processFile(file)) {
        changedCount++;
        console.log(`✓ Fixed: ${path.relative(srcDir, file)}`);
      }
    } catch (error) {
      console.error(`✗ Error processing ${file}:`, error.message);
    }
  }

  console.log(`\n========================================`);
  console.log(`Summary:`);
  console.log(`  Fixed: ${changedCount} files`);
  console.log(`========================================`);
}

main();
