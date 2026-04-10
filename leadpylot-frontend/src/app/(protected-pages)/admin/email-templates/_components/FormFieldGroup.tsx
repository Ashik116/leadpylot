'use client';

import type { ReactNode } from 'react';

interface FormFieldGroupProps {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

export default function FormFieldGroup({ id, label, error, children, className = '' }: FormFieldGroupProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-sm font-medium opacity-70">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
