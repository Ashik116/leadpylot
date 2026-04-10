export const formatValue = (value: string | null | undefined) => {
  return value === null || value === undefined || value === '' ? '-' : value;
};
