import { useState, useEffect } from 'react';
import Select from '@/components/ui/Select';
import { useProjects } from '@/services/hooks/useProjects';

type Option = {
  value: string;
  label: string;
  isFixed?: boolean;
  isDisabled?: boolean;
};

type Props = {
  selectedProjectIds: string[];
  onChange: (value: string[]) => void;
};

const LoadProjects = ({ selectedProjectIds, onChange }: Props) => {
  const { data: projects, isLoading: isProjectsLoading } = useProjects();
  const [options, setOptions] = useState<Option[]>([]);

  const selectedOptions = options?.filter((opt) => selectedProjectIds?.includes(opt?.value));

  useEffect(() => {
    if (projects) {
      const projectsData = Array.isArray(projects) ? projects : projects?.data;
      const projectOptions =
        projectsData?.length > 0 &&
        projectsData?.map((project: any) => ({
          value: project?._id,
          label: project?.name,
        }));
      setOptions(projectOptions || []);
    }
  }, [projects]);

  return (
    <div>
      <Select
        instanceId="projects"
        isMulti
        options={options}
        isLoading={isProjectsLoading}
        value={selectedOptions}
        onChange={(selected) => {
          const selectedIds =
            (selected?.length > 0 && selected?.map((s: Option) => s?.value)) || [];
          onChange(selectedIds);
        }}
      />
    </div>
  );
};

export default LoadProjects;
