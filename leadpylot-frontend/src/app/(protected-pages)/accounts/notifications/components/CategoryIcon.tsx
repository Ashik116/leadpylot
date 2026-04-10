'use client';

import {
  HiOutlineUser,
  HiOutlineTag,
  HiOutlineDocumentText,
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlineInformationCircle,
  HiOutlineClipboardList,
} from 'react-icons/hi';

interface CategoryIconProps {
  category: string;
  className?: string;
}

export default function CategoryIcon({ category, className = 'h-4 w-4' }: CategoryIconProps) {
  switch (category) {
    case 'authentication':
      return <HiOutlineUser className={className} />;
    case 'assignment':
      return <HiOutlineTag className={className} />;
    case 'project':
      return <HiOutlineDocumentText className={className} />;
    case 'financial':
      return <HiOutlineCheckCircle className={className} />;
    case 'system':
      return <HiOutlineExclamation className={className} />;
    case 'email':
      return <HiOutlineDocumentText className={className} />;
    case 'todo':
      return <HiOutlineClipboardList className={className} />;
    default:
      return <HiOutlineInformationCircle className={className} />;
  }
}
