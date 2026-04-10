import type { InternalAxiosRequestConfig } from 'axios';

import { getAuthToken } from '@/utils/cookies';

const AxiosRequestIntrceptorConfigCallback = async (config: InternalAxiosRequestConfig) => {
  const token = getAuthToken();

  // Only add Authorization header if token exists
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
};

export default AxiosRequestIntrceptorConfigCallback;
