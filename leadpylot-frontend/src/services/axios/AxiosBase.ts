export const runtime = 'nodejs';
import axios from 'axios';
import AxiosResponseIntrceptorErrorCallback, {
  resetAuthFailureCounter,
} from './AxiosResponseIntrceptorErrorCallback';
import AxiosRequestIntrceptorConfigCallback from './AxiosRequestIntrceptorConfigCallback';
import { routeRequest } from './MicroserviceRouter';
import appConfig from '@/configs/app.config';
import type { AxiosError } from 'axios';

const AxiosBase = axios.create({
  timeout: 60000, // Default timeout, can be overridden per request
  baseURL: appConfig.apiPrefix,
});

AxiosBase.interceptors.request.use(
  async (config) => {
    // First, route the request to the correct microservice
    const routedConfig = routeRequest(config);

    // Then, apply authentication and other request modifications
    return await AxiosRequestIntrceptorConfigCallback(routedConfig);
  },
  (error) => {
    return Promise.reject(error);
  }
);

AxiosBase.interceptors.response.use(
  (response) => {
    // Reset auth failure counter on successful response
    resetAuthFailureCounter();
    return response;
  },
  async (error: AxiosError) => {
    await AxiosResponseIntrceptorErrorCallback(error);
    return Promise.reject(error);
  }
);

export default AxiosBase;
