import { useUpdateUser } from "@/services/hooks/useUsers";
import Switcher from "@/components/ui/Switcher";
import toast from "@/components/ui/toast";
import Notification from '@/components/ui/Notification';

const UnmaskSwitcher = ({ userId, currentValue }: { userId: string; currentValue: boolean }) => {
    const updateUserMutation = useUpdateUser(userId);

    const handleUnmaskChange = (checked: boolean) => {
        updateUserMutation.mutate(
            { _id: userId, unmask: checked } as any,
            {
                onSuccess: () => {
                    toast.push(
                        <Notification title="User updated" type="success">
                            User unmask setting updated successfully
                        </Notification>
                    );
                },
                onError: () => {
                    toast.push(
                        <Notification title="Update failed" type="danger">
                            Failed to update user unmask setting
                        </Notification>
                    );
                },
            }
        );
    };

    return (
        <div onClick={(e) => e.stopPropagation()}>
            <Switcher checked={currentValue} onChange={handleUnmaskChange} />
        </div>
    );
};
export default UnmaskSwitcher;