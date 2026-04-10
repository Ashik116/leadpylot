import FileNotFound from '@/assets/svg/FileNotFound';
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import { UserSources } from '@/services/UsersService';

const ProviderSources = ({ sources }: { sources: UserSources[] }) => {
  return (
    <div className="mt-8">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Provider Sources</h2>
        </div>
        {sources.length > 0 ? (
          <Table>
            <Table.THead>
              <Table.Tr>
                <Table.Th>Source</Table.Th>
                <Table.Th>Number of Leads</Table.Th>
                <Table.Th>Current Price per Lead</Table.Th>
              </Table.Tr>
            </Table.THead>
            <Table.TBody>
              {sources?.map((source) => (
                <Table.Tr key={source?.source_id} className="hover:bg-sand-4">
                  <Table.Td>{source?.source_name}</Table.Td>
                  <Table.Td>{source?.lead_count}</Table.Td>
                  <Table.Td>${source?.price?.toFixed(2)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.TBody>
          </Table>
        ) : (
          <div className="flex items-center justify-center">
            <div>
              <FileNotFound />
              <span className="font-semibold">No data found!</span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ProviderSources;
