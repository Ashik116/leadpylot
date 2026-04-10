'use client';

import { HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi';
import Button from '@/components/ui/Button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
      <div className="text-sm text-gray-700">
        Page {currentPage} of {totalPages}
      </div>

      <div className="flex items-center space-x-2">
        <Button
          size="sm"
          variant="plain"
          icon={<HiOutlineChevronLeft className="h-4 w-4" />}
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </Button>

        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
          return (
            <Button
              key={page}
              size="sm"
              variant={currentPage === page ? 'solid' : 'plain'}
              onClick={() => onPageChange(page)}
            >
              {page}
            </Button>
          );
        })}

        <Button
          size="sm"
          variant="plain"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <div className="flex items-center gap-2">
            Next
            <HiOutlineChevronRight className="h-4 w-4" />
          </div>
        </Button>
      </div>
    </div>
  );
}
