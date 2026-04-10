import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ApolloIcon from '@/components/ui/ApolloIcon';

interface AccessDeniedProps {
  title?: string;
  message?: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
  className?: string;
}

export default function AccessDenied({
  title = 'Access Denied',
  message = "You don't have permission to access this resource. Please contact your administrator if you believe this is an error.",
  showBackButton = true,
  showHomeButton = true,
  className = '',
}: AccessDeniedProps) {
  const router = useRouter();

  const handleGoBack = () => {
    router.back();
  };

  const handleGoHome = () => {
    router.push('/dashboards');
  };

  return (
    <div
      className={`flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8 ${className}`}
    >
      <Card className="w-full max-w-md p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <ApolloIcon name="times" className="text-3xl text-red-600" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">{title}</h2>
          <p className="mt-2 text-sm text-gray-600">{message}</p>
        </div>
        {(showBackButton || showHomeButton) && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-col space-y-2">
              {showBackButton && (
                <Button onClick={handleGoBack} variant="secondary" className="w-full">
                  Go Back
                </Button>
              )}
              {showHomeButton && (
                <Button onClick={handleGoHome} variant="solid" className="w-full">
                  Go to Dashboard
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
