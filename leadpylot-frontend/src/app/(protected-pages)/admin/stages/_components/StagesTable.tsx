import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ScrollBar from '@/components/ui/ScrollBar';
import Table from '@/components/ui/Table';
import { useRouter } from 'next/navigation';
import { Stage } from '@/services/StagesService';
import ApolloIcon from '@/components/ui/ApolloIcon';
const { Tr, Th, Td, THead, TBody } = Table;

interface StagesTableProps {
  data: Stage[];
  isLoading?: boolean;
  setIsCreateDialogOpen?: (isOpen: boolean) => void;
  onStageClick?: (stageId: string) => void;
  showHeader?: boolean;
}

export function StagesTable({
  data,
  setIsCreateDialogOpen,
  onStageClick,
  showHeader = true,
}: StagesTableProps) {
  const router = useRouter();

  const handleStageClick = (stageId: string) => {
    if (onStageClick) {
      onStageClick(stageId);
    } else {
      router.push(`/admin/stages/${stageId}`);
    }
  };

  return (
    <Card>
      {showHeader && (
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1>Stages</h1>
            <p>Total stages: {data?.length}</p>
          </div>
          {setIsCreateDialogOpen && (
            <Button
              variant="solid"
              icon={<ApolloIcon name="plus" className="text-md" />}
              onClick={() => setIsCreateDialogOpen(true)}
            >
              New Stage
            </Button>
          )}
        </div>
      )}
      <ScrollBar>
        <div className="min-w-max">
          <Table>
            <THead>
              <Tr>
                <Th>Stage Name</Th>
                <Th>Is Won Stage</Th>
              </Tr>
            </THead>
            <TBody>
              {data.map((stage) => (
                <Tr
                  key={stage._id}
                  onClick={() => handleStageClick(stage._id)}
                  className="cursor-pointer"
                >
                  <Td>{stage.name}</Td>
                  <Td>
                    {stage?.info.isWonStage && (
                      <span className="bg-evergreen rounded-full px-2 py-1 text-xs font-bold text-white">
                        Yes
                      </span>
                    )}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
      </ScrollBar>
    </Card>
  );
}
