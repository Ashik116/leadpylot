'use client';

import React from 'react';

interface ColorGridProps {
    selectedColor?: string;
    onColorSelect: (color: string) => void;
}

/**
 * Generate a 10x10 grid of colors (100 colors total)
 * Colors transition smoothly:
 * - Horizontally: greens/yellows → oranges/reds → blues/purples/pinks
 * - Vertically: darker/saturated at top → lighter/pastel at bottom
 */
const generateColorGrid = (): string[] => {
    const colors: string[] = [];
    const rows = 10;
    const cols = 10;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            // Horizontal: hue rotation from green (120°) through yellow, orange, red, blue, purple, pink
            // Start at 120° (green) and rotate through the spectrum
            // Adjust the range to cover: green → yellow → orange → red → blue → purple → pink
            const hueStart = 120; // Green
            const hueEnd = 360; // Full circle (back to red/pink)
            const hueRange = hueEnd - hueStart;
            const hue = hueStart + (col / (cols - 1)) * hueRange;

            // Vertical: saturation and lightness variation
            // Top: darker, more saturated (S: 80-100%, L: 30-50%)
            // Bottom: lighter, less saturated/pastel (S: 40-60%, L: 70-90%)
            const saturation = 80 - (row / (rows - 1)) * 40; // 80% → 40%
            const lightness = 40 + (row / (rows - 1)) * 50; // 40% → 90%

            // Convert HSL to hex
            const hslToHex = (h: number, s: number, l: number): string => {
                l /= 100;
                const a = (s * Math.min(l, 1 - l)) / 100;
                const f = (n: number) => {
                    const k = (n + h / 30) % 12;
                    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
                    return Math.round(255 * color)
                        .toString(16)
                        .padStart(2, '0');
                };
                return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
            };

            const hexColor = hslToHex(hue, saturation, lightness);
            colors.push(hexColor);
        }
    }

    return colors;
};

export const ColorGrid: React.FC<ColorGridProps> = ({ selectedColor, onColorSelect }) => {
    const colors = React.useMemo(() => generateColorGrid(), []);

    return (
        <div className="grid grid-cols-10 gap-1 p-2">
            {colors.map((color, index) => {
                const isSelected = selectedColor?.toUpperCase() === color.toUpperCase();
                return (
                    <button
                        key={index}
                        onClick={() => onColorSelect(color)}
                        className={`h-6 w-6 rounded border-2 transition-all hover:scale-110 ${isSelected
                                ? 'border-indigo-600 ring-2 ring-indigo-300 ring-offset-1'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                        style={{ backgroundColor: color }}
                        title={color}
                        aria-label={`Select color ${color}`}
                    />
                );
            })}
        </div>
    );
};
