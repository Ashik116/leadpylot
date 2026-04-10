import React, { useRef } from 'react';
import { useAssignmentModalStore } from '@/stores/assignmentModalStore';
import { useSession } from '@/hooks/useSession';
import { Role } from '@/configs/navigation.config/auth.route.config';

export const AssignmentCell: React.FC<any> = ({ lead, children, className = 'cursor-pointer' }) => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === Role?.ADMIN;
  const { openAssignmentModal } = useAssignmentModalStore();
  const isProcessingRef = useRef(false);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!isAdmin || isProcessingRef.current) return;
    isProcessingRef.current = true;
    e.stopPropagation();
    e.preventDefault();
    openAssignmentModal(lead);
    // Reset the processing flag after a short delay
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 100);
  };

  return (
    <div
      onDoubleClick={handleDoubleClick}
      data-no-navigate="true"
      className={className}
      title={isAdmin ? 'Double-click to assign/transfer' : ''}
    >
      {children}
    </div>
  );
};
