import Card from '@/components/ui/Card';
import { useSelectedProjectStore } from '@/stores/selectedProjectStore';
import { useRouter } from 'next/navigation';
import { getProjectColor } from '@/utils/projectColors';

// type TProjectCardProps = {
//   projectId: string;
//   projectName: string;
//   totalAgents?: number;
//   totalLeads: number;
//   totalOffers: number;
//   onClick?: () => void;
// }

const Info = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex items-center gap-2">
    <p className="font-semibold">{label}:</p>
    <p>{value?.toString()?.padStart(2, '0')}</p>
  </div>
);

export function ProjectCard({
  projectData: { projectId, projectName, offers, totalLeads, ...data },
}: any) {
  const router = useRouter();
  const { setSelectedProject } = useSelectedProjectStore();

  const onSelectProject = () => {
    setSelectedProject({
      ...data,
      value: projectId,
      label: projectName,
      _id: projectId,
      name: projectName,
    });
    router.push('/dashboards/leads');
  };

  // Return null if project data is invalid
  if (!projectId || !projectName) return null;

  const projectColor = getProjectColor(projectName);

  return (
    <Card className="cursor-pointer shadow-xl" onClick={onSelectProject}>
      <div className="pb-6">
        <h3 className="capitalize" style={{ color: projectColor }}>
          {projectName || 'N/A'}
        </h3>
      </div>
      <div className="flex flex-col gap-2">
        {/* <Info label="Total Agents" value={totalAgents} /> */}
        <Info label="Total Leads" value={totalLeads} />
        <Info label="Total Offers" value={offers?.total} />
      </div>
    </Card>
  );
}

export function ProjectCardSkeleton() {
  return (
    <Card className="mb-4 cursor-not-allowed shadow-xl">
      <div className="pb-6">
        <h3 className="text-moss-2 bg-sand-4 min-h-10 min-w-20 animate-pulse rounded-2xl capitalize" />
      </div>
      <div className="flex flex-col gap-2">
        <p className="bg-sand-4 min-h-6 min-w-20 animate-pulse rounded-2xl" />
        <p className="bg-sand-4 min-h-6 min-w-14 animate-pulse rounded-2xl" />
      </div>
    </Card>
  );
}
