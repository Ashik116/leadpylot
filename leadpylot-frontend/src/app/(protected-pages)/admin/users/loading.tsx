import LoadingSpinner from '@/components/shared/LoadingSpinner';

export default function Loading() {
    return (
        <div className="flex h-screen items-center justify-center bg-white">
            <LoadingSpinner size="lg" variant="spinner" />
        </div>
    );
}