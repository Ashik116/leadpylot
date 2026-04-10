'use client';

import Button from '@/components/ui/Button';

interface EmptyStateProps {
    title?: string;
    message?: string;
    buttonText?: string;
    onButtonClick: () => void;
}

const EmptyState = ({
    title = 'Email not found',
    message = "The email you're looking for doesn't exist.",
    buttonText = 'Back to Inbox',
    onButtonClick
}: EmptyStateProps) => {
    return (
        <div className="rounded-lg bg-white p-3 text-center sm:p-4 lg:p-6">
            <h4 className="text-base font-semibold sm:text-lg">{title}</h4>
            <p className="mt-2 text-sm text-gray-500 sm:text-base">
                {message}
            </p>
            <Button
                className="mt-3 text-sm sm:mt-4 sm:text-base"
                onClick={onButtonClick}
            >
                {buttonText}
            </Button>
        </div>
    );
};

export default EmptyState; 