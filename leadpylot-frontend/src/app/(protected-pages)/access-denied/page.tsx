'use client';

import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ApolloIcon from '@/components/ui/ApolloIcon';

export default function AccessDenied() {
  const router = useRouter();

  const handleGoBack = () => {
    router.back();
  };

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <ApolloIcon name="times" className="text-3xl" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="mt-2 text-sm text-gray-600">
            You don&apos;t have permission to access this page. Please contact your administrator if
            you believe this is an error.
          </p>
        </div>
        <div className="mt-6 space-y-4">
          <div className="flex flex-col space-y-2">
            <Button onClick={handleGoBack} className="w-full">
              Go Back
            </Button>
            <Button onClick={handleGoHome} variant="solid" className="w-full">
              Go to Dashboard
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
