'use client';

import { HiOutlineDocumentText } from 'react-icons/hi';
import Button from '@/components/ui/Button';

interface NoActivitiesProps {
  onRefresh: () => void;
}

export default function NoActivities({ onRefresh }: NoActivitiesProps) {
  return (
    <div className="py-12 text-center">
      <HiOutlineDocumentText className="mx-auto mb-4 h-16 w-16 text-gray-400" />
      <h3 className="mb-2 text-lg font-medium text-gray-900">No activities found</h3>
      <p className="mb-4 text-gray-500">Try adjusting your filters or search terms</p>
      <Button onClick={onRefresh}>Refresh</Button>
    </div>
  );
}
