'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';

interface VariableOption {
  value: string;
  label: string;
}

interface GroupedSelectedVariables {
  sortedGroups: Array<{ groupName: string; variables: VariableOption[] }>;
  otherVariables: VariableOption[];
}

interface VariableChipProps {
  variable: VariableOption;
  isSelected: boolean;
  isJustInserted: boolean;
  onClick: (value: string) => void;
}

function VariableChip({ variable, isSelected, isJustInserted, onClick }: VariableChipProps) {
  return (
    <div
      className={`group relative flex items-center gap-1 rounded-sm border px-2 py-0.5 text-sm transition-all ${isSelected
        ? 'border-blue-500 bg-blue-100 font-medium text-blue-800 shadow-sm'
        : 'border-blue-200 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm'
        } ${isJustInserted ? ' border-green-400 ' : ' '} cursor-pointer`}
      onClick={() => onClick(variable.value)}
      title={`Click to insert {{${variable.value}}} at cursor position`}
    >
      <span>{variable.label}</span>
      <ApolloIcon
        name="arrow-down"
        className="h-3.5 w-3.5 text-blue-500 opacity-0 transition-opacity group-hover:opacity-100"
      />
      {isJustInserted && (
        <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-xs text-white">
          <ApolloIcon name="check" />
        </span>
      )}
    </div>
  );
}

interface SelectedVariablesPanelProps {
  groupedSelectedVariables: GroupedSelectedVariables;
  selectedField: string | null;
  justInsertedVariable: string | null;
  onVariableClick: (value: string) => void;
}

export function SelectedVariablesPanel({
  groupedSelectedVariables,
  selectedField,
  justInsertedVariable,
  onVariableClick,
}: SelectedVariablesPanelProps) {
  return (
    <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-2 pb-1.5">
      <div className="max-h-32 md:max-h-80 2xl:max-h-[25vh] space-y-1 overflow-y-auto">
        {groupedSelectedVariables.sortedGroups.map(({ groupName, variables }) => (
          <div key={groupName} className=" flex items-center  flex-wrap">
            <div className="text-xs font-semibold text-blue-800 mr-2">{groupName} fields</div>
            <div className="flex flex-wrap gap-2">
              {variables.map((variable) => (
                <VariableChip
                  key={variable.value}
                  variable={variable}
                  isSelected={selectedField === variable.value}
                  isJustInserted={justInsertedVariable === variable.value}
                  onClick={onVariableClick}
                />
              ))}
            </div>
          </div>
        ))}
        {groupedSelectedVariables.otherVariables.length > 0 && (
          <div className="flex items-center flex-wrap">
            <div className="text-xs font-semibold text-blue-800 mr-2">Other fields</div>
            <div className="flex flex-wrap gap-2">
              {groupedSelectedVariables.otherVariables.map((variable) => (
                <VariableChip
                  key={variable.value}
                  variable={variable}
                  isSelected={selectedField === variable.value}
                  isJustInserted={justInsertedVariable === variable.value}
                  onClick={onVariableClick}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
