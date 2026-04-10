/**
 * Microservice Router for Axios Requests
 *
 * This module intercepts axios requests and routes them to the correct microservice
 * based on the endpoint path. It enables gradual migration from monolith to microservices.
 */

import { type InternalAxiosRequestConfig } from 'axios';
import { routeToMicroservice, isMicroservicesEnabled } from '@/configs/microservices.config';

/**
 * Route axios request to the correct microservice
 *
 * This function modifies the axios config to use the correct baseURL
 * for each request based on the endpoint path.
 *
 * @param config - Axios request configuration
 * @returns Modified axios configuration with correct baseURL
 */
export const routeRequest = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  // Skip routing if microservices are disabled
  if (!isMicroservicesEnabled()) {
    return config;
  }

  // Skip routing if request already has a full URL (starts with http)
  if (config.url?.startsWith('http://') || config.url?.startsWith('https://')) {
    return config;
  }

  // Get the endpoint path
  const endpoint = config.url || '/';

  // Route to the correct microservice
  const microserviceUrl = routeToMicroservice(endpoint);

  // Update the baseURL for this specific request
  config.baseURL = microserviceUrl;

  return config;
};

/**
 * Log microservice routing information (development only)
 * Helps debug which service is handling each request
 */
export const logRouting = (config: InternalAxiosRequestConfig): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[Microservice Router] ${config.method?.toUpperCase()} ${config.url} → ${config.baseURL}`
    );
  }
};

export default {
  routeRequest,
  logRouting,
};
