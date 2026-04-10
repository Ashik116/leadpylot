import { AxiosError } from 'axios';

interface ErrorResponse {
  message: string;
}

export function toastWithAxiosError(error: unknown): ErrorResponse {
  if (error instanceof AxiosError) {
    if (error.response) {
      // Server responded with a status other than 2xx
      return {
        message:
          error.response.data?.message ||
          error.response.data?.error ||
          'Server responded with an error',
      };
    } else if (error.request) {
      // Request was made but no response received

      return { message: 'No response received from the server' };
    } else {
      // Something else caused the error

      return { message: error.message || 'Unexpected error occurred' };
    }
  }

  // Handle non-Axios errors

  return { message: 'An unexpected error occurred' };
}
