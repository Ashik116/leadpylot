import ApolloIcon from '@/components/ui/ApolloIcon';
import classNames from '@/utils/classNames';

const PhoneToggle = ({ className }: { className?: string }) => {
  return (
    <div className={classNames('flex text-lg', className)}>
      <ApolloIcon name="phone"  />
    </div>
  );
};

export default PhoneToggle;
