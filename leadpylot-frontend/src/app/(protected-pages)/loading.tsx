import LoadingSpinner from '@/components/shared/LoadingSpinner';

const Loading = () => {
  return (
    <div className="flex h-screen items-center justify-center bg-white" >
      <LoadingSpinner size="lg" variant="spinner" />
    </div>
  );
};

export default Loading;
