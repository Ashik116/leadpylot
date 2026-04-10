import Skeleton from '@/components/ui/Skeleton';

const BankDetailsSkeleton = () => (
  <div className="space-y-4">
    {/* Bank Name */}
    <div className="space-y-2">
      <Skeleton width="60px" height="16px" />
      <Skeleton width="100%" height="40px" />
    </div>

    {/* LEI Code */}
    <div className="space-y-2">
      <Skeleton width="80px" height="16px" />
      <Skeleton width="100%" height="40px" />
    </div>

    {/* Country */}
    <div className="space-y-2">
      <Skeleton width="70px" height="16px" />
      <Skeleton width="100%" height="40px" />
    </div>

    {/* Address */}
    <div className="space-y-2">
      <Skeleton width="90px" height="16px" />
      <Skeleton width="100%" height="40px" />
    </div>

    {/* Min/Max Limits */}
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Skeleton width="80px" height="16px" />
        <Skeleton width="100%" height="40px" />
      </div>
      <div className="space-y-2">
        <Skeleton width="80px" height="16px" />
        <Skeleton width="100%" height="40px" />
      </div>
    </div>

    {/* Status toggles */}
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton variant="circle" width="20px" height="20px" />
        <Skeleton width="100px" height="16px" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton variant="circle" width="20px" height="20px" />
        <Skeleton width="120px" height="16px" />
      </div>
    </div>

    {/* Action buttons */}
    <div className="flex gap-2 pt-4">
      <Skeleton width="100px" height="36px" />
      <Skeleton width="80px" height="36px" />
    </div>
  </div>
);

export default BankDetailsSkeleton;
