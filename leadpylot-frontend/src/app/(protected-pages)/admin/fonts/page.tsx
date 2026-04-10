import React from 'react';
import { FontManager } from '@/components/shared/FontManagement';

export default function FontManagementPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Font Management</h1>
        <p className="text-gray-600">
          Upload custom fonts like Allianz Neo and manage system fonts for PDF templates
        </p>
      </div>

      <FontManager showActions={true} />
    </div>
  );
}