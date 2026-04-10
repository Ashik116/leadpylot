import { AxiosError } from 'axios';

export interface ApiError {
  error: string;
  code: number;
  trace_id?: string;
}

export interface ErrorHandlerResult {
  isAccessDenied: boolean;
  isNotFound: boolean;
  errorMessage: string;
  errorCode?: number;
}

export const handleApiError = (error: unknown): ErrorHandlerResult => {
  const defaultResult: ErrorHandlerResult = {
    isAccessDenied: false,
    isNotFound: false,
    errorMessage: 'An unexpected error occurred',
    errorCode: undefined,
  };

  if (!error) {
    return defaultResult;
  }

  // Handle Axios errors
  if (error instanceof Error && 'response' in error) {
    const axiosError = error as AxiosError<ApiError>;
    const responseData = axiosError.response?.data;

    if (responseData && typeof responseData === 'object') {
      const { error: errorMessage, code } = responseData;

      // Handle specific error codes
      switch (code) {
        case 1100:
          return {
            isAccessDenied: true,
            isNotFound: false,
            errorMessage: errorMessage || 'Lead not found or access denied',
            errorCode: code,
          };
        case 404:
          return {
            isAccessDenied: false,
            isNotFound: true,
            errorMessage: errorMessage || 'Resource not found',
            errorCode: code,
          };
        default:
          return {
            isAccessDenied: false,
            isNotFound: false,
            errorMessage: errorMessage || 'An error occurred',
            errorCode: code,
          };
      }
    }

    // Handle HTTP status codes
    if (axiosError.response?.status === 403) {
      return {
        isAccessDenied: true,
        isNotFound: false,
        errorMessage: 'Access denied',
        errorCode: 403,
      };
    }

    if (axiosError.response?.status === 404) {
      return {
        isAccessDenied: false,
        isNotFound: true,
        errorMessage: 'Resource not found',
        errorCode: 404,
      };
    }
  }

  // Handle regular Error objects
  if (error instanceof Error) {
    return {
      ...defaultResult,
      errorMessage: error.message,
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      ...defaultResult,
      errorMessage: error,
    };
  }

  return defaultResult;
};

// Hook for handling API errors in components
export const useApiErrorHandler = () => {
  return { handleApiError };
};
