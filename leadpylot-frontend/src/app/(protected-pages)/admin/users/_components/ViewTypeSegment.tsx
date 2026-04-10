import { useUpdateUser } from '@/services/hooks/useUsers';
import Segment from '@/components/ui/Segment';
import type { SegmentValue } from '@/components/ui/Segment/context';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

const ViewTypeSegment = ({
    userId,
    currentValue,
}: {
    userId: string;
    currentValue: 'listView' | 'detailsView' | undefined;
}) => {
    const updateUserMutation = useUpdateUser(userId);
    const value = currentValue || 'listView';

    const handleViewTypeChange = (newValue: SegmentValue) => {
        const viewType = typeof newValue === 'string' ? newValue : newValue[0] || 'listView';
        if (viewType === 'detailsView') return;
        if (currentValue === 'listView') return;
        updateUserMutation.mutate(
            { _id: userId, view_type: 'listView' } as any,
            {
                onSuccess: () => {
                    toast.push(
                        <Notification title="User updated" type="success">
                            User view type updated successfully
                        </Notification>
                    );
                },
                onError: () => {
                    toast.push(
                        <Notification title="Update failed" type="danger">
                            Failed to update user view type
                        </Notification>
                    );
                },
            }
        );
    };

    return (
        <div onClick={(e) => e.stopPropagation()}>
            <Segment value={value} onChange={handleViewTypeChange} size="xs" className="rounded-md p-0 m-0 overflow-hidden">
                <Segment.Item value="listView" className="rounded-none px-1 m-0 h-full">List view</Segment.Item>
                <Segment.Item value="detailsView" disabled className="rounded-none px-1 m-0 h-full">Details view</Segment.Item>
            </Segment>
        </div>
    );
};

export default ViewTypeSegment;

