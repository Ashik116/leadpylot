export const getTextColor = (bgColor: string) => {
    if (!bgColor) return '#000';

    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Perceived brightness
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    return brightness > 150 ? '#000000' : '#ffffff';
}