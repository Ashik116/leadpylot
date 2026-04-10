'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useChangeUserPassword } from '@/services/hooks/useUsers';
import { toast } from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { ApolloIcon } from '@/components/ui/ApolloIcon';

interface ChangePasswordFormProps {
  userId: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

const ChangePasswordForm = ({ userId, onSuccess, onClose }: ChangePasswordFormProps) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { mutate: changePassword, isPending } = useChangeUserPassword(userId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords
    if (!newPassword) {
      setError('Password is required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError(null);

    // Call API to change password
    changePassword(
      { newPassword },
      {
        onSuccess: () => {
          toast.push(<Notification type="success">Password changed successfully</Notification>);
          setNewPassword('');
          setConfirmPassword('');
          if (onSuccess) {
            onSuccess();
          }
          if (onClose) {
            onClose();
          }
        },
        onError: (error: any) => {
          toast.push(
            <Notification type="danger">
              {error.message || 'Failed to change password'}
            </Notification>
          );
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-sm">
      <div>
        <label htmlFor="newPassword" className="mb-2 block text-sm font-medium">
          New Password
        </label>
        <Input
          id="newPassword"
          type={showNewPassword ? "text" : "password"}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Enter new password"
          suffix={<ApolloIcon name={showNewPassword ? "eye-filled" : "eye-slash"} className="text-sm" onClick={() => setShowNewPassword(!showNewPassword)} />}
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium">
          Confirm Password
        </label>
        <Input
          id="confirmPassword"
          type={showConfirmPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          suffix={<ApolloIcon name={showConfirmPassword ? "eye-filled" : "eye-slash"} className="text-sm" onClick={() => setShowConfirmPassword(!showConfirmPassword)} />}
        />
      </div>

      {error && <div className="text-rust text-sm">{error}</div>}

      <div className="flex justify-end space-x-2">
        <Button
          variant="secondary"
          onClick={onClose}
        >
          Close
        </Button>
        <Button
          type="submit"
          variant="solid"
          loading={isPending}
          disabled={!newPassword || !confirmPassword || isPending}
        >
          Change Password
        </Button>
      </div>
    </form>
  );
};

export default ChangePasswordForm;
