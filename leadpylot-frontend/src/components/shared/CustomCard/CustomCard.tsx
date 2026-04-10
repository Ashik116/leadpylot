import Card from '@/components/ui/Card';
import ApolloIcon from "@/components/ui/ApolloIcon";

// Skeleton loader component
const SkeletonItem = () => (
    <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
        <div className="flex-1">
            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-1" />
            <div className="h-4 w-24 bg-gray-300 rounded animate-pulse" />
        </div>
    </div>
);

// Info item component
const InfoItem = ({ icon, label, value, action }: {
    icon: string, label: string, value: string | React.ReactNode, action?: React.ReactNode
}) => (
    <div className="flex items-center gap-3">
        <ApolloIcon name={icon as any} className="mr-1 font-bold" />
        <div className="flex-1 flex items-center space-x-2 whitespace-break-spaces">
            <div className="text-sm font-bold 2xl:text-base">{label}:</div>
            <div className="text-sm break-words text-gray-900 2xl:text-base">{value}</div>
        </div>
        {action}
    </div>
);

// Card component
const CustomCard = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <Card
        header={{
            content: <h4>{title}</h4>,
        }}
        className="h-full"
        bodyClass="flex flex-col gap-2 rounded-lg px-4 py-2"
    >
        <div className="space-y-3 pb-5">{children}</div>
    </Card>
);
export { CustomCard, InfoItem, SkeletonItem };