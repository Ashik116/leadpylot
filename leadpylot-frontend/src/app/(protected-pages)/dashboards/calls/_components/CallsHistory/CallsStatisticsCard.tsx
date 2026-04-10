import Card from '@/components/ui/Card';
import ApolloIcon from "@/components/ui/ApolloIcon";

type TStatCardProps = {
    title: string;
    value: string | number;
    icon: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    className?: string;
    bgColor?: string;
}

const StatCard: React.FC<TStatCardProps> = ({ title, value, icon, trend, className = '', bgColor = '' }) => (
    <Card className={`p-4 w-72 ${className} ${bgColor}`}>
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm text-gray-600">{title}</p>
                <p className="text-2xl font-bold">{value}</p>
                {trend && (
                    <p className={`text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%
                    </p>
                )}
            </div>
            <div className="p-3 bg-blue-100 rounded-full border">
                <ApolloIcon name={icon as any} className="text-blue-600" />
            </div>
        </div>
    </Card>
);

const CallsStatisticsCard = ({ statistics }: { statistics: any }) => {
    return (
        <div className="flex flex-wrap  gap-4">
            <StatCard
                title="Total Calls"
                value={statistics.totalCalls.toLocaleString()}
                icon="phone"
                bgColor="bg-blue-100"
            />
            <StatCard
                title="Answer Rate"
                value={`${statistics.answerRate}%`}
                icon="check-circle"
                trend={{
                    value: parseFloat(statistics.answerRate),
                    isPositive: parseFloat(statistics.answerRate) > 50
                }}
                bgColor="bg-green-100"
            />
            <StatCard
                title="Avg Duration"
                value={`${Math.floor(statistics.averageCallDuration / 60)}:${String(statistics.averageCallDuration % 60).padStart(2, '0')}`}
                icon="pie-chart"
                bgColor="bg-yellow-100"
            />
            <StatCard
                title="Total Talk Time"
                value={`${Math.floor(statistics.totalTalkTime / 3600)}h ${Math.floor((statistics.totalTalkTime % 3600) / 60)}m`}
                icon="clock-eight"
                bgColor="bg-red-100"
            />
        </div>
    )
}
export default CallsStatisticsCard;