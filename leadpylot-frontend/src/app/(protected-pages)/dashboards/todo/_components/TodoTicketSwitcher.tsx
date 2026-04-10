import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';

type ToggleValue = 'todo' | 'ticket' | 'cards' | 'table';

type TodoTicketSwitcherProps = {
    mode: ToggleValue;
    onModeChange: (mode: ToggleValue) => void;
    leftValue?: ToggleValue;
    rightValue?: ToggleValue;
    leftLabel?: string;
    rightLabel?: string;
    leftIcon?: string;
    rightIcon?: string;
    activeColor?: string;
};

const TodoTicketSwitcher = ({
    mode,
    onModeChange,
    leftValue = 'todo',
    rightValue = 'ticket',
    leftLabel = 'Todo',
    rightLabel = 'Ticket',
    leftIcon = 'persistent-checklist',
    rightIcon = 'tag',
    activeColor = 'bg-black text-white',
}: TodoTicketSwitcherProps) => {
    return (
        <div className="inline-flex items-stretch overflow-hidden rounded-md border border-gray-300">
            <Button
                variant="plain"
                onClick={() => onModeChange(leftValue)}
                icon={<ApolloIcon name={leftIcon as any} />}
                className={`rounded-none px-3 py-1 text-sm ${mode === leftValue ? activeColor : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
            >
                {leftLabel}
            </Button>
            <Button
                variant="plain"
                onClick={() => onModeChange(rightValue)}
                icon={<ApolloIcon name={rightIcon as any} />}
                className={`rounded-none border-l border-gray-300 px-3 py-1 text-sm ${mode === rightValue ? activeColor : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
            >
                {rightLabel}
            </Button>
        </div>
    );
};

export default TodoTicketSwitcher;

