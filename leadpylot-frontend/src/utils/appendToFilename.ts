export function appendToFilename(filename: string, type: string) {
  if (typeof filename !== 'string') return '';

  const lastDotIndex = filename.lastIndexOf('.');

  if (lastDotIndex === -1) {
    return filename + `_${type}`; // No extension
  }

  const name = filename.slice(0, lastDotIndex);
  const ext = filename.slice(lastDotIndex);
  return `${name}_${type}${ext}`;
}
