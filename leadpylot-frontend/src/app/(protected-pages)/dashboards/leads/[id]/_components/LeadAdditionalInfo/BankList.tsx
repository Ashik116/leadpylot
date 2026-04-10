import SimpleBankCard from '@/app/(protected-pages)/admin/banks/_components/SimpleBankCard';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { ProjectBank, TLead } from '@/services/LeadsService';
import { Bank } from '@/services/SettingsService';
import { useProject } from '@/services/hooks/useProjects';
import NotFoundData from './NotFoundData';

interface BankListProps {
  lead: TLead;
}

const BankList = ({ lead }: BankListProps) => {
  const projectId = lead?.project?.[0]?._id;
  const { data, isLoading } = useProject(projectId, !!projectId);

  const banks = (data as any)?.banks || [];
  if (!projectId) {
    return <div className="py-8 text-center text-gray-500">No banks available for this lead.</div>;
  }

  if (isLoading)
    return (
      <div className="flex h-full items-center justify-center relative bg-white">
        <LoadingSpinner size="lg" variant="spinner" />
      </div>
    );

  if (banks.length === 0) {
    return <NotFoundData message="No banks available for this lead." />;
  }

  return (
    <div className=" flex flex-col  bg-white">
      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 ">
        {banks.map((bank: ProjectBank) => (
          <div
            key={bank._id}
            className="hover:shadow-md transition-all duration-300 relative flex justify-between 
            border-b
            border-t-0 
            border-r  
            xl:nth-[2n]:rounded-r-lg 
            xl:nth-[2n+1]:rounded-l-lg
            xl:nth-[2n+1]:border-l
            2xl:nth-[2n]:rounded-r-none
            2xl:nth-[3n]:rounded-l-none
            2xl:nth-[3n]:rounded-r-lg
            2xl:nth-[3n]:border-l-0
            2xl:nth-[3n+1]:rounded-l-lg
            2xl:nth-[3n+1]:rounded-r-0
            2xl:nth-[3n+1]:border-l
            2xl:nth-[3n+2]:border-l-0
            2xl:nth-[3n+2]:rounded-l-none
            2xl:nth-[2n+1]:border-l-none
            2xl:nth-[2n+1]:border-r-none
            2xl:nth-[3n+1]:border-l-none
            2xl:nth-[3n+1]:border-r-none
            "
          >
            <SimpleBankCard bank={bank as Bank} user={true} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default BankList;
