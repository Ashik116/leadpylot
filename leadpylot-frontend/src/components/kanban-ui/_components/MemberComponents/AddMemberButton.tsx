import React from 'react';
import Avatar from '@/components/ui/Avatar';
import Tooltip from '@/components/ui/Tooltip';
import ApolloIcon from '@/components/ui/ApolloIcon';

interface AddMemberButtonProps {
    onClick?: (e?: React.MouseEvent) => void;
    size?: number | 'sm' | 'md' | 'lg';
    tooltip?: string;
    className?: string;
    groupMember?: boolean;
}

export const AddMemberButton: React.FC<AddMemberButtonProps> = ({
    onClick,
    size = 28,
    tooltip = 'Manage members',
    className = '',
    groupMember = true
}) => {
    if (!onClick) return null;

    const handleWrapperClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClick?.(e);
    };

    return (
        <Tooltip title={tooltip}>
            <div onClick={handleWrapperClick} className={groupMember ? 'inline-block' : 'flex'}>
                <Avatar
                    size={size}
                    shape="circle"
                    className={`bg-gray-100 border border-evergreen hover:bg-evergreen hover:text-white text-evergreen group cursor-pointer  -ml-2 transition-all duration-300 ${className}`}
                >
                    <ApolloIcon name="user-plus" className=" " />
                </Avatar>
            </div>
        </Tooltip>
    );
};
