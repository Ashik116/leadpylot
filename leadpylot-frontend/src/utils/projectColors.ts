const colorCache = new Map<string, string>();

function hslToHex(h: number, s: number, l: number): string {
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
}

function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

export function getProjectColor(projectName: string | undefined | null): string {
  if (!projectName || typeof projectName !== 'string') {
    return '#6b7280'; // gray-500 fallback
  }

  const normalized = projectName.trim().toLowerCase();
  const cached = colorCache.get(normalized);
  if (cached) return cached;

  const hash = stableHash(normalized);

  // Deterministic but well-distributed H, S, L
  const hue = ((hash % 360) + 360) % 360; // 0-359
  const saturation = 65 + Math.abs((hash >> 3) % 20); // 65-84
  const lightness = 42 + Math.abs((hash >> 7) % 10);
  const hex = hslToHex(hue, saturation, lightness);
  colorCache.set(normalized, hex);
  return hex;
}

export function lightenColor(hex: string, percent: number): string {
  hex = hex.replace(/^\s*#|\s*$/g, '');
  if (hex.length === 3) {
    hex = hex.replace(/(.)/g, '$1$1');
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const newR = Math.min(255, r + (255 - r) * (percent / 100));
  const newG = Math.min(255, g + (255 - g) * (percent / 100));
  const newB = Math.min(255, b + (255 - b) * (percent / 100));
  return `#${Math.round(newR).toString(16).padStart(2, '0')}${Math.round(newG)
    .toString(16)
    .padStart(2, '0')}${Math.round(newB).toString(16).padStart(2, '0')}`;
}
