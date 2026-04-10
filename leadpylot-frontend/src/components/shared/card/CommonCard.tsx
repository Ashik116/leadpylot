import Card from '@/components/ui/Card';

type TCommonCardProps = {
  title: string;
  value: string | number | null | undefined;
  icon: React.ReactNode;
  label: string;
  color: string;
};
const CommonCard = ({ title, value, icon, label, color }: TCommonCardProps) => {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`font-bol h-8 text-2xl ${color}`}>{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
        {icon}
      </div>
    </Card>
  );
};

export default CommonCard;
