import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useMailTemplateVariables } from '@/services/hooks/useMailTemplate';
import Button from '@/components/ui/Button';
import FormItem from '@/components/ui/Form/FormItem';
import Select from '@/components/ui/Select';
import { Editor } from '@tiptap/react';
import { SelectedVariablesPanel } from './SelectedVariablesPanel';
import { HiXMark } from 'react-icons/hi2';

interface VariableSelectorProps {
  editor: Editor | null;
  howManyOffers?: number;
}

// Base fields that are always preselected
const BASE_PRESELECTED_FIELDS = [
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'nametitle', label: 'Name Title' },
  { value: 'email_from', label: 'Email Address' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'project_name', label: 'Project Name' },
  { value: 'agent_login', label: 'Agent Name/Login' },
  { value: 'draft_time', label: 'Draft Time' },
];

// Generate preselected fields dynamically based on howManyOffers
const generatePreselectedFields = (
  howManyOffers: number
): Array<{ value: string; label: string }> => {
  const fields = [...BASE_PRESELECTED_FIELDS];
  const numOffers = howManyOffers || 1;

  // Generate offer-specific fields for each offer from 1 to howManyOffers
  for (let offerNum = 1; offerNum <= numOffers; offerNum++) {
    fields.push(
      { value: `offer${offerNum}_title`, label: `Offer Title (Offer ${offerNum})` },
      {
        value: `offer${offerNum}_investment_volume`,
        label: `Amount (Offer ${offerNum})`,
      },
      { value: `offer${offerNum}_interest_rate`, label: `Rate (Offer ${offerNum})` },
      { value: `offer${offerNum}_status`, label: `Offer Status (Offer ${offerNum})` },
      { value: `offer${offerNum}_bank_name`, label: `Bank Name (Offer ${offerNum})` },
      { value: `offer${offerNum}_bank_iban`, label: `Bank IBAN (Offer ${offerNum})` },
      {
        value: `offer${offerNum}_payment_terms_info_info_months`,
        label: `Payment Terms Months (Offer ${offerNum})`,
      },
      {
        value: `offer${offerNum}_bonus_amount_info_amount`,
        label: `Bonus Amount (Offer ${offerNum})`,
      }
    );
  }

  return fields;
};

export const VariableSelector: React.FC<VariableSelectorProps> = ({ editor, howManyOffers }) => {
  const { data: templateVariablesData, status } = useMailTemplateVariables(howManyOffers);

  const templateVariablesOptions = Object.entries(templateVariablesData?.variables || {}).flatMap(
    ([, value]) => {
      return Object.entries(value).map(([key, value]) => ({
        value: key,
        label: value,
      }));
    }
  );

  const [selectedField, setSelectedField] = useState<string | null>(null);
  const hasInitializedRef = useRef(false);
  const previousHowManyOffersRef = useRef<number | undefined>(howManyOffers);

  // Initialize preselected variables
  const initialSelectedVariables = useMemo(() => {
    if (templateVariablesOptions.length === 0 || status !== 'success') {
      return [];
    }

    // Generate preselected fields dynamically based on howManyOffers
    const preselectedFields = generatePreselectedFields(howManyOffers || 1);

    // Match predefined fields with available options
    return preselectedFields
      .filter((preselectedField) => {
        return templateVariablesOptions.some((option) => option.value === preselectedField.value);
      })
      .map((preselectedField) => {
        // Find the actual label from templateVariablesOptions
        const foundOption = templateVariablesOptions.find(
          (option) => option.value === preselectedField.value
        );
        return {
          value: preselectedField.value,
          label: (foundOption?.label as string) || preselectedField.label,
        };
      });
  }, [templateVariablesOptions, status, howManyOffers]);

  const [selectedVariables, setSelectedVariables] = useState<
    Array<{ value: string; label: string }>
  >([]);

  // Reset initialization when howManyOffers changes
  useEffect(() => {
    if (previousHowManyOffersRef.current !== howManyOffers) {
      hasInitializedRef.current = false;
      previousHowManyOffersRef.current = howManyOffers;
    }
  }, [howManyOffers]);

  // Initialize preselected variables when they become available or when howManyOffers changes
  useEffect(() => {
    if (!hasInitializedRef.current && initialSelectedVariables.length > 0) {
      hasInitializedRef.current = true;
      setSelectedVariables(initialSelectedVariables);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelectedVariables.length, howManyOffers]);
  const [justInsertedVariable, setJustInsertedVariable] = useState<string | null>(null);

  const templateVariables = useMemo(() => {
    if (status !== 'success' || !templateVariablesData) return [];

    const groupDisplayNames: Record<string, string> = {
      lead: 'Lead Information',
      project: 'Project Information',
      agent: 'Agent Information',
      offers: 'Offer Information',
      bank: 'Bank Information',
      payment_terms: 'Payment Terms',
      bonus_amount: 'Bonus Information',
      opening: 'Opening Information',
    };

    const grouped: Array<{
      label: string;
      options: Array<{ value: string; label: string }>;
    }> = [];

    Object.entries(templateVariablesData.variables || {}).forEach(([groupName, groupVars]) => {
      if (typeof groupVars === 'object' && groupVars !== null) {
        // Handle nested offers structure (offer1, offer2, etc.)
        if (
          groupName === 'offers' &&
          groupVars &&
          typeof groupVars === 'object' &&
          !Array.isArray(groupVars)
        ) {
          // Check if it's the new nested structure (has offer1, offer2, etc.)
          const keys = Object.keys(groupVars);
          const firstKey = keys[0];
          if (firstKey && /^offer\d+$/.test(firstKey) && typeof groupVars[firstKey] === 'object') {
            // Process each offer group (offer1, offer2, etc.)
            Object.entries(groupVars).forEach(([offerKey, offerData]) => {
              if (
                typeof offerData === 'object' &&
                offerData !== null &&
                !Array.isArray(offerData)
              ) {
                // Process each category within the offer (offers, bank, payment_terms, etc.)
                Object.entries(offerData).forEach(([categoryName, categoryVars]) => {
                  if (
                    typeof categoryVars === 'object' &&
                    categoryVars !== null &&
                    !Array.isArray(categoryVars)
                  ) {
                    const options = Object.entries(categoryVars).map(([key, label]) => ({
                      value: key,
                      label: label as string,
                    }));

                    if (options.length > 0) {
                      const offerNumber = offerKey.replace('offer', '');
                      const categoryLabel = groupDisplayNames[categoryName] || categoryName;
                      grouped.push({
                        label: `Offer ${offerNumber} - ${categoryLabel}`,
                        options,
                      });
                    }
                  }
                });
              }
            });
            return; // Skip the default processing for offers
          }
        }

        // Default processing for non-nested groups
        const options = Object.entries(groupVars)
          .filter(([, value]) => typeof value === 'string')
          .map(([key, label]) => ({
            value: key,
            label: label as string,
          }));

        if (options.length > 0) {
          grouped.push({
            label: groupDisplayNames[groupName] || groupName,
            options,
          });
        }
      }
    });

    return grouped;
  }, [status, templateVariablesData]);

  const handleVariableSelect = (selectedOption: any) => {
    if (!selectedOption) {
      setSelectedField(null);
      setSelectedVariables([]);
      return;
    }

    if (Array.isArray(selectedOption)) {
      const options = selectedOption as { value: string; label: string }[];
      setSelectedVariables(options);
      if (options.length > 0) {
        setSelectedField(options[options.length - 1].value);
      } else {
        setSelectedField(null);
      }
      return;
    }

    const variable = selectedOption.value;
    const label = selectedOption.label;
    setSelectedField(variable);

    if (!selectedVariables.some((v) => v.value === variable)) {
      setSelectedVariables([...selectedVariables, { value: variable, label }]);
    }
  };

  const handleVariableTabClick = (variable: string) => {
    if (!editor) return;

    editor.commands.focus();
    editor.commands.insertContent(`{{${variable}}}`);
    setJustInsertedVariable(variable);

    setTimeout(() => {
      setJustInsertedVariable(null);
    }, 600);

    // Scroll logic can be kept here or handled by editor hook if complex
    setTimeout(() => {
      const proseMirror = editor.view.dom;
      const selection = editor.state.selection;
      const coords = editor.view.coordsAtPos(selection.to);
      const editorRect = proseMirror.getBoundingClientRect();
      if (coords.top < editorRect.top || coords.bottom > editorRect.bottom) {
        proseMirror.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Group selected variables by offer/group number
  const groupedSelectedVariables = useMemo(() => {
    const groups: Record<string, Array<{ value: string; label: string }>> = {};
    const otherVariables: Array<{ value: string; label: string }> = [];

    selectedVariables.forEach((variable) => {
      // Try to extract group number from variable value (e.g., "offer1_payment_terms_description")
      const offerMatch = variable.value.match(/offer(\d+)/i);
      if (offerMatch) {
        const groupNumber = offerMatch[1];
        const groupKey = `Offer Group ${groupNumber}`;
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(variable);
      } else {
        // Try to extract from label (e.g., "Payment Terms (Offer 3)")
        const labelMatch = variable.label.match(/\(Offer\s+(\d+)\)/i);
        if (labelMatch) {
          const groupNumber = labelMatch[1];
          const groupKey = `Offer ${groupNumber}`;
          if (!groups[groupKey]) {
            groups[groupKey] = [];
          }
          groups[groupKey].push(variable);
        } else {
          // Variables that don't belong to any offer group
          otherVariables.push(variable);
        }
      }
    });

    // Sort groups by number
    const sortedGroups = Object.keys(groups)
      .sort((a, b) => {
        const numA = parseInt(a.replace('Group ', ''), 10);
        const numB = parseInt(b.replace('Group ', ''), 10);
        return numA - numB;
      })
      .map((key) => ({ groupName: key, variables: groups[key] }));

    return { sortedGroups, otherVariables };
  }, [selectedVariables]);

  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="template_content" className="mb-2 block text-sm font-medium opacity-70">
          Fields
        </label>
        {selectedVariables.length > 0 ? (<Button
          type="button"
          size="xs"
          variant="destructive"
          onClick={() => setSelectedVariables([])}
          title="Clear all selected variables"
          className='h-5'
          icon={<HiXMark />}
        >
          Clear all
        </Button>)
          : null}
      </div>
      <FormItem className="mb-0 w-full">
        <Select
          isLoading={status === 'pending'}
          options={templateVariables}
          onChange={handleVariableSelect}
          placeholder="Select variable..."
          isClearable
          className="w-full"
          selectMultipleOptions
          value={selectedVariables}
        />
      </FormItem>

      {selectedVariables.length > 0 && (
        <SelectedVariablesPanel
          groupedSelectedVariables={groupedSelectedVariables}
          selectedField={selectedField}
          justInsertedVariable={justInsertedVariable}
          onVariableClick={handleVariableTabClick}
        />
      )}
      {/* Cursor hint passed up or rendered here? 
          The original code rendered it next to "Template Content" label.
          For now, we can expose state if needed or render it locally if we move that label here.
          Actually, the label "Template Content" is below this section in the original code. 
          We can perhaps pass the hint state up or just omit it for now as a minor UX detail, 
          or better: Render the "Template Content" label + hint in the main form using a callback? 
          Let's keep it simple. The VariableSelector is for selecting variables.
      */}
    </div>
  );
};
