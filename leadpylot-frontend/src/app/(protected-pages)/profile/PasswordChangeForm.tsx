'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function PasswordChangeForm() {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const newErrors: { newPassword?: string; confirmPassword?: string } = {};
    if (!formData?.newPassword) {
      newErrors.newPassword = 'Please enter your new password';
    } else if (formData?.newPassword?.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }
    if (!formData?.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData?.confirmPassword !== formData?.newPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    setSubmitted(true);
    if (Object.keys(validationErrors).length === 0) {
      // TODO: Add API integration here
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="newPassword" className="mb-1 block font-medium">
          New Password
        </label>
        <Input
          id="newPassword"
          type="password"
          name="newPassword"
          value={formData?.newPassword}
          onChange={handleChange}
          placeholder="Enter new password"
        />
        {errors?.newPassword && (
          <div className="mt-1 text-sm text-red-500">{errors.newPassword}</div>
        )}
      </div>
      <div>
        <label htmlFor="confirmPassword" className="mb-1 block font-medium">
          Confirm Password
        </label>
        <Input
          id="confirmPassword"
          type="password"
          name="confirmPassword"
          value={formData?.confirmPassword}
          onChange={handleChange}
          placeholder="Confirm new password"
        />
        {errors?.confirmPassword && (
          <div className="mt-1 text-sm text-red-500">{errors?.confirmPassword}</div>
        )}
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="solid">
          Update Password
        </Button>
      </div>
      {submitted && Object?.keys(errors)?.length === 0 && (
        <div className="mt-2 text-sm text-green-600">Password updated (mock)</div>
      )}
    </form>
  );
}
