import FileNotFound from '@/assets/svg/FileNotFound';
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import { UserProject } from '@/services/UsersService';

// Define a type for the project data

const AgentProjects = ({ projects }: { projects: UserProject[] }) => {
  // Static data for the table

  return (
    <div className="mt-8">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Agent Projects</h2>
        </div>
        {projects.length > 0 ? (
          <Table>
            <Table.THead>
              <Table.Tr>
                <Table.Th>Project</Table.Th>
                <Table.Th>Alias Name</Table.Th>
                <Table.Th>Phone Number</Table.Th>
                <Table.Th>Email Address</Table.Th>
                <Table.Th>Number of Leads</Table.Th>
              </Table.Tr>
            </Table.THead>
            <Table.TBody>
              {projects?.map((project) => (
                <Table.Tr key={project?.project_id} className="hover:bg-sand-4">
                  <Table.Td>{project?.project_name}</Table.Td>
                  <Table.Td>{project?.alias_name}</Table.Td>
                  <Table.Td>{project?.alias_phone_number}</Table.Td>
                  <Table.Td>{project?.alias_email}</Table.Td>
                  <Table.Td>
                    <div className="flex items-center">
                      <span className="mr-2">{project?.leads_assigned_count}</span>
                    </div>
                  </Table.Td>
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

export default AgentProjects;
