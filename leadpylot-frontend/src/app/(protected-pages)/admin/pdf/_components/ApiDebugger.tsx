'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import { useFieldMappingOptions } from '@/services/hooks/usePdfTemplates';

const ApiDebugger = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const { data: mappingOptions } = useFieldMappingOptions();

  const checkApiStructure = () => {
    console.log('🔍 API Debug Info:');
    console.log('1. Field Mapping Options Response:', mappingOptions);
    console.log('2. Available Data Sources:', mappingOptions?.data?.data_sources);
    console.log(
      '3. Field Options Structure:',
      Object.keys(mappingOptions?.data?.field_options || {})
    );

    // Test payload structure
    const testPayload = {
      mappings: [
        {
          pdf_field_name: 'Test_Field',
          pdf_field_type: 'text',
          data_source: 'lead',
          data_field: 'contact_name',
          transform_rules: {},
          active: true,
        },
      ],
    };

    console.log('4. Test Payload Structure:', testPayload);

    setDebugInfo({
      mappingOptions,
      testPayload,
      timestamp: new Date().toISOString(),
    });
  };

  const validateDataSource = (source: string) => {
    const validSources = mappingOptions?.data?.data_sources || [];
    const isValid = validSources.includes(source);
    console.log(`Data source "${source}" is ${isValid ? 'VALID' : 'INVALID'}`);
    console.log('Valid sources:', validSources);
    return isValid;
  };

  return (
    <div className="rounded-lg border bg-gray-50 p-4">
      <h3 className="mb-3 font-medium">🐛 API Debugger</h3>

      <div className="space-y-3">
        <Button onClick={checkApiStructure} variant="secondary" size="sm">
          Check API Structure
        </Button>

        <div className="space-x-2">
          <Button onClick={() => validateDataSource('lead')} variant="secondary" size="sm">
            Test lead source
          </Button>
          <Button onClick={() => validateDataSource('offer')} variant="secondary" size="sm">
            Test offer source
          </Button>
          <Button onClick={() => validateDataSource('bank')} variant="secondary" size="sm">
            Test bank source
          </Button>
        </div>

        {debugInfo && (
          <div className="mt-4 rounded border bg-white p-3 text-xs">
            <h4 className="mb-2 font-medium">Debug Results:</h4>
            <pre className="max-h-60 overflow-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}

        <div className="mt-3 text-sm text-gray-600">
          <p>
            <strong>Expected data_sources:</strong> lead, offer, bank, agent, project,
            payment_terms, bonus_terms, computed, static
          </p>
          <p>
            <strong>If validation fails:</strong> Check backend validation logic for data_source
            field
          </p>
        </div>
      </div>
    </div>
  );
};

export default ApiDebugger;
