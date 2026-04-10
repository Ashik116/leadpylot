'use client';

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
        active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
      }`}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

export function AvailableBadge({ available }: { available: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
        available ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'
      }`}
    >
      <span className={`w-1 h-1 rounded-full ${available ? 'bg-blue-500' : 'bg-gray-300'}`} />
      {available ? 'Available' : 'Unavailable'}
    </span>
  );
}
