import Loading from '@/components/shared/Loading';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ScrollBar from '@/components/ui/ScrollBar';
import Table from '@/components/ui/Table';
import { Source } from '@/services/SourceService';
import { LuPlus } from 'react-icons/lu';
import { useRouter } from 'next/navigation';
const { Tr, Th, Td, THead, TBody } = Table;

interface SourceTableProps {
  data: Source[];
  isLoading: boolean;
  setIsCreateDialogOpen: (isOpen: boolean) => void;
}

export function SourceTable({ data, isLoading, setIsCreateDialogOpen }: SourceTableProps) {
  const router = useRouter();

  if (isLoading) {
    return <Loading className="absolute inset-0" loading={true} />;
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold">Sources</h4>
          <p className="text-xs">Total sources: {data?.length}</p>
        </div>
        <Button
          variant="solid"
          size="xs"
          icon={<LuPlus />}
          onClick={() => setIsCreateDialogOpen(true)}
        >
          New Source
        </Button>
      </div>
      <ScrollBar>
        <div className="min-w-max">
          <Table>
            <THead>
              <Tr>
                <Th>Name</Th>
                <Th>Color</Th>
                <Th>Price</Th>
                <Th>Provider</Th>
                <Th>Lead Count</Th>
                <Th>Status</Th>
              </Tr>
            </THead>
            <TBody>
              {data.map((source) => (
                <Tr
                  key={source._id}
                  onClick={() => router.push(`/admin/sources/${source?._id}`)}
                  className="cursor-pointer"
                >
                  <Td>{source.name}</Td>
                  <Td>
                    {source.color ? (
                      <span
                        className="inline-block h-3 w-3 shrink-0"
                        style={{ backgroundColor: source.color }}
                        title={source.color}
                        role="img"
                        aria-label={`Source color ${source.color}`}
                      />
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </Td>
                  <Td>${source.price}</Td>
                  <Td>{source.provider?.name || '-'}</Td>
                  <Td>{source.lead_count}</Td>
                  <Td>
                    {source.active ? (
                      <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs font-semibold text-white">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-400 px-2 py-0.5 text-xs font-semibold text-white">
                        Inactive
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
