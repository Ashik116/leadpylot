export const sortingOptions = [
  {
    value: 'count-desc',
    label: 'Count (High to Low)',
    sortBy: 'count',
    sortOrder: 'desc' as const,
  },
  {
    value: 'count-asc',
    label: 'Count (Low to High)',
    sortBy: 'count',
    sortOrder: 'asc' as const,
  },
  {
    value: 'name-asc',
    label: 'Name (A to Z)',
    sortBy: 'name',
    sortOrder: 'asc' as const,
  },
  {
    value: 'name-desc',
    label: 'Name (Z to A)',
    sortBy: 'name',
    sortOrder: 'desc' as const,
  },
  {
    value: 'avg_revenue-desc',
    label: 'Avg Revenue (High to Low)',
    sortBy: 'avg_revenue',
    sortOrder: 'desc' as const,
  },
  {
    value: 'avg_revenue-asc',
    label: 'Avg Revenue (Low to High)',
    sortBy: 'avg_revenue',
    sortOrder: 'asc' as const,
  },
  {
    value: 'total_revenue-desc',
    label: 'Total Revenue (High to Low)',
    sortBy: 'total_revenue',
    sortOrder: 'desc' as const,
  },
  {
    value: 'total_revenue-asc',
    label: 'Total Revenue (Low to High)',
    sortBy: 'total_revenue',
    sortOrder: 'asc' as const,
  },
  {
    value: 'latest_lead-desc',
    label: 'Latest Lead (Newest First)',
    sortBy: 'latest_lead',
    sortOrder: 'desc' as const,
  },
  {
    value: 'latest_lead-asc',
    label: 'Latest Lead (Oldest First)',
    sortBy: 'latest_lead',
    sortOrder: 'asc' as const,
  },
  {
    value: 'oldest_lead-desc',
    label: 'Oldest Lead (Newest First)',
    sortBy: 'oldest_lead',
    sortOrder: 'desc' as const,
  },
  {
    value: 'oldest_lead-asc',
    label: 'Oldest Lead (Oldest First)',
    sortBy: 'oldest_lead',
    sortOrder: 'asc' as const,
  },
];
