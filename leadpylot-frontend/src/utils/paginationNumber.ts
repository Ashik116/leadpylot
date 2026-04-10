// total porps help to total number of record

export const getPaginationOptions = (total: number) => {
  const defaultArray = [10, 20, 50, 100, 200, 500, 1000];
  if (!total || total < 50) return [50];
  return Array.from(new Set([...defaultArray, total]))
    .filter((n) => n <= total)
    .sort((a, b) => a - b);
};
