import { getProjectColor } from '@/utils/projectColors';
import { AGENT_COLORS } from '@/utils/utils';

/**
 * Generate colors based on grouping field and group name
 * @param level - The hierarchy level (0, 1, 2, etc.)
 * @param groupName - The name of the group
 * @param groupingFields - Array of grouping fields to determine the context
 * @returns Hex color string
 */
export function getGroupColor(
  level: number,
  groupName: string,
  groupingFields: string[] = []
): string {
  // Get the current grouping field for this level
  const currentField = groupingFields[level] || groupingFields[level - 1];

  if (!currentField) {
    // Fallback colors for unknown fields
    const fallbackColors = [
      '#3b82f6', // blue-500
      '#10b981', // emerald-500
      '#f59e0b', // amber-500
      '#ef4444', // red-500
      '#8b5cf6', // violet-500
      '#06b6d4', // cyan-500
      '#84cc16', // lime-500
      '#f97316', // orange-500
    ];
    return fallbackColors[level % fallbackColors.length];
  }

  // Project grouping - use project colors
  if (
    currentField === 'project' ||
    currentField === 'project.name' ||
    currentField === 'project_name'
  ) {
    return getProjectColor(groupName);
  }

  // Agent grouping - use agent colors but convert to hex
  if (
    currentField === 'agent' ||
    currentField === 'assigned_agent' ||
    currentField === 'agent.login' ||
    currentField === 'assigned_agent.login'
  ) {
    // Get agent color class and convert to hex
    const getAgentColorHex = (name: string): string => {
      try {
        if (!name || typeof name !== 'string') return '#6b7280'; // gray-500
        const trimmed = name.trim().toUpperCase();
        let key = '';
        if (trimmed.length === 1) {
          key = trimmed.charAt(0);
        } else if (trimmed.length === 2) {
          key = trimmed.slice(0, 2);
        } else if (trimmed.length > 2) {
          key = trimmed.slice(0, 2) + trimmed.charAt(trimmed.length - 1);
        }

        const colorKeys = Object.keys(AGENT_COLORS);
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
          hash = (hash << 5) - hash + key.charCodeAt(i);
          hash |= 0;
        }
        const colorIndex = Math.abs(hash) % colorKeys.length;
        const tailwindClass = AGENT_COLORS[colorKeys[colorIndex]] || 'text-gray-500';

        // Convert Tailwind classes to hex colors
        const colorMap: Record<string, string> = {
          'text-red-500': '#ef4444',
          'text-red-600': '#dc2626',
          'text-red-700': '#b91c1c',
          'text-orange-500': '#f97316',
          'text-orange-600': '#ea580c',
          'text-orange-700': '#c2410c',
          'text-yellow-500': '#eab308',
          'text-yellow-600': '#ca8a04',
          'text-yellow-700': '#a16207',
          'text-green-500': '#22c55e',
          'text-green-600': '#16a34a',
          'text-green-700': '#15803d',
          'text-teal-500': '#14b8a6',
          'text-teal-600': '#0d9488',
          'text-teal-700': '#0f766e',
          'text-blue-500': '#3b82f6',
          'text-blue-600': '#2563eb',
          'text-blue-700': '#1d4ed8',
          'text-indigo-500': '#6366f1',
          'text-indigo-600': '#4f46e5',
          'text-indigo-700': '#4338ca',
          'text-purple-500': '#a855f7',
          'text-purple-600': '#9333ea',
          'text-purple-700': '#7c3aed',
          'text-pink-500': '#ec4899',
          'text-pink-600': '#db2777',
          'text-gray-500': '#6b7280',
        };

        return colorMap[tailwindClass] || '#6b7280';
      } catch {
        return '#6b7280';
      }
    };

    return getAgentColorHex(groupName);
  }

  // Status grouping - use status colors but convert to hex
  if (
    currentField === 'status' ||
    currentField === 'status.name' ||
    currentField === 'status_name' ||
    currentField === 'use_status'
  ) {
    // Simple status color mapping - you can expand this based on your status types
    const statusColorMap: Record<string, string> = {
      new: '#3b82f6', // blue
      opening: '#f59e0b', // amber
      contract: '#f59e0b', // amber
      positiv: '#10b981', // emerald
      negativ: '#ef4444', // red
      convert: '#22c55e', // green
      reclamation: '#ef4444', // red
      lost: '#f97316', // orange
      angebot: '#06b6d4', // cyan
      privat: '#8b5cf6', // violet
      sent: '#06b6d4', // cyan
      netto1: '#84cc16', // lime
      netto2: '#65a30d', // lime-600
      confirmation: '#10b981', // emerald
      payment: '#1f2937', // gray-800
    };

    const statusLower = groupName.toLowerCase();
    for (const [key, color] of Object.entries(statusColorMap)) {
      if (statusLower.includes(key)) {
        return color;
      }
    }

    // Fallback for unknown status
    return '#6b7280'; // gray-500
  }

  // For other fields, use a hash-based color generation
  let hash = 0;
  for (let i = 0; i < groupName.length; i++) {
    hash = (hash << 5) - hash + groupName.charCodeAt(i);
    hash |= 0;
  }

  const hue = Math.abs(hash) % 360;
  const saturation = 65 + (Math.abs(hash >> 8) % 20); // 65-84%
  const lightness = 45 + (Math.abs(hash >> 16) % 10); // 45-54%

  // Convert HSL to hex
  const hslToHex = (h: number, s: number, l: number): string => {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0,
      g = 0,
      b = 0;

    if (0 <= h && h < 60) {
      r = c;
      g = x;
      b = 0;
    } else if (60 <= h && h < 120) {
      r = x;
      g = c;
      b = 0;
    } else if (120 <= h && h < 180) {
      r = 0;
      g = c;
      b = x;
    } else if (180 <= h && h < 240) {
      r = 0;
      g = x;
      b = c;
    } else if (240 <= h && h < 300) {
      r = x;
      g = 0;
      b = c;
    } else if (300 <= h && h < 360) {
      r = c;
      g = 0;
      b = x;
    }

    const toHex = (v: number) =>
      Math.round((v + m) * 255)
        .toString(16)
        .padStart(2, '0');

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  return hslToHex(hue, saturation, lightness);
}
