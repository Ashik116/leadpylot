import ApolloIcon from '@/components/ui/ApolloIcon';
import classNames from '@/utils/classNames';

type TodoTicketTypeBadgeProps = {
    type?: string | null;
    className?: string;
};

const TodoTicketTypeBadge = ({ type, className }: TodoTicketTypeBadgeProps) => {
    if (!type) return null;

    return (
        <div
            className={classNames(
                'flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
                type === 'Ticket'
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-gray-100 text-gray-700',
                className
            )}
        >
            <ApolloIcon
                name={type === 'Ticket' ? 'tag' : ('persistent-checklist' as any)}
                className="text-xs"
            />
            {type}
        </div>
    );
};

export default TodoTicketTypeBadge;

