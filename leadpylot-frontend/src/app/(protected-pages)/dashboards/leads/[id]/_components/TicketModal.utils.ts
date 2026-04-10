/**
 * Utility functions for TicketModal component
 */

import { MAX_DESCRIPTION_LENGTH } from './TicketModal.constants';
import type { ValidationError, TicketFormData } from './TicketModal.types';

/**
 * Validates the ticket form data
 */
export const validateTicketForm = (
  selectedTicketTypes: string[],
  description: string,
  selectedAgentId: string
): ValidationError | null => {
  if (selectedTicketTypes.length === 0) {
    return { message: 'Please select at least one ticket type' };
  }

  if (!description.trim()) {
    return { message: 'Please enter a description' };
  }

  if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
    return { message: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less` };
  }

  if (!selectedAgentId) {
    return { message: 'Please select an agent to assign this ticket to' };
  }

  return null;
};

/**
 * Checks if the form is valid
 */
export const isTicketFormValid = (formData: TicketFormData): boolean => {
  return (
    formData.selectedTicketTypes.length > 0 &&
    formData.description.trim().length > 0 &&
    formData.description.trim().length <= MAX_DESCRIPTION_LENGTH &&
    formData.selectedAgentId.length > 0
  );
};

/**
 * Extracts error message from unknown error object
 */
export const extractErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object') {
    const errorObj = error as {
      response?: {
        data?: {
          error?: string;
          message?: string;
        };
      };
      message?: string;
    };

    return (
      errorObj?.response?.data?.error ||
      errorObj?.response?.data?.message ||
      errorObj?.message ||
      'An unexpected error occurred'
    );
  }

  return 'An unexpected error occurred';
};
