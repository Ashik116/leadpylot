/**
 * Microservices Configuration
 * Maps API endpoints to their respective microservices
 *
 * This configuration allows gradual migration from monolith to microservices
 * by routing specific endpoints to their designated services while keeping
 * others on the monolith.
 */

export type MicroserviceConfig = {
  name: string;
  baseUrl: string;
  endpoints: string[];
  description: string;
};

/**
 * Get microservice URLs from environment variables
 * Falls back to localhost ports for local development.
 * For production (non-localhost gateway), no port is appended - nginx/reverse proxy routes by path.
 */
const getServiceUrl = (envVar: string, defaultPort: number): string => {
  const envValue = typeof process !== 'undefined' ? process.env?.[envVar] : undefined;
  if (envValue) return envValue;

  const rootUrl =
    typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_MICROSERVICE_ROOT_API_URL : undefined;
  const baseUrl = rootUrl || 'http://localhost';

  // Only append port for localhost - production gateways use path-based routing
  const isLocalhost =
    baseUrl.includes('localhost') ||
    baseUrl.includes('127.0.0.1') ||
    baseUrl.startsWith('http://localhost') ||
    baseUrl.startsWith('https://localhost');
  return isLocalhost ? `${baseUrl.replace(/\/$/, '')}:${defaultPort}` : baseUrl.replace(/\/$/, '');
};

/**
 * Microservices configuration
 * Add new services here as they are extracted from the monolith
 *
 * IMPORTANT: Order matters! Services with more specific endpoints should be
 * defined BEFORE services with broader patterns to ensure correct routing.
 * For example, MAIL_SERVICE (/settings/mailservers/*) is checked before
 * CONFIGURATION (/settings/*) to prevent mail endpoints from being caught
 * by the broader pattern.
 */
export const MICROSERVICES: Record<string, MicroserviceConfig> = {
  // User & Auth Microservice (Port 4000)
  USER_AUTH: {
    name: 'User & Auth Service',
    baseUrl: getServiceUrl('NEXT_PUBLIC_USER_AUTH_SERVICE_URL', 4000),
    endpoints: [
      '/auth/login',
      '/auth/logout',
      '/auth/register',
      '/auth/me',
      '/auth/change-password',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/refresh-token',
      '/auth/validate',
      '/auth/*', // Catches all /auth/* routes
      '/users',
      '/users/*', // Catches all /users/:id routes
      '/login-security',
      '/device-security',
      '/unified-security',
      '/unified-security/*',
      '/login-security/*',
      '/device-security/*',
      '/roles',
      '/roles/*',
      '/permissions',
      '/permissions/*',
      '/permission-templates',
      '/permission-templates/*',
      '/auth/me/permissions',
      '/credentials',
      '/credentials/*', // Catches all /credentials/* routes including /credentials/user/:userId/decrypt/:credentialId
      '/offices',
      '/offices/*', // Office CRUD and employees
      '/telegram-bots',
      '/telegram-bots/*', // Telegram bot configuration management (includes bot-status, updates/all, reload)
    ],
    description:
      'Handles user authentication, authorization, user management, RBAC, offices, and Telegram bot configuration',
  },

  // Mail Service (Port 4004)
  // MUST be defined BEFORE CONFIGURATION to catch mail endpoints first
  MAIL_SERVICE: {
    name: 'Mail Service',
    baseUrl: getServiceUrl('NEXT_PUBLIC_MAIL_SERVICE_URL', 4008),
    endpoints: [
      // Mail Server Settings
      '/settings/mailservers', // GET /settings/mailservers
      '/settings/mailservers/*', // POST, PUT, DELETE /settings/mailservers/:id

      // Email System - All routes (Admin, Agent, Shared endpoints)
      '/email-system',
      '/email-system/*', // Catches all email-system routes including:
      '/emails',
      '/emails/*', // Catches all emails routes including:
      '/api/email-template-categories/*',
    ],
    description: 'Handles mail server configuration, email system, and email-related operations',
  },

  // Configuration Service (Port 4006)
  CONFIGURATION: {
    name: 'Configuration Service',
    baseUrl: getServiceUrl('NEXT_PUBLIC_CONFIG_SERVICE_URL', 4006),
    endpoints: [
      '/settings',
      '/settings/*',
      '/banks',
      '/banks/*',
      '/projects',
      '/projects/*',
      '/closed-leads/*',
      '/sources',
      '/sources/*',
      '/column-preference',
      '/column-preference/*',
      '/default-grouping-fields',
      '/default-grouping-fields/*',
      '/lead-forms',
      '/lead-forms/*',
      '/allowed-sites',
      '/allowed-sites/*',
      '/saved-filters',
      '/saved-filters/*',
    ],
    description:
      'Manages system settings, banks, projects, sources, column preferences, lead forms, allowed sites, and user saved filter presets (excluding mail)',
  },

  // Document Service (Port 4002)
  // MUST be defined BEFORE LEAD_OFFERS_SERVICE to catch specific document endpoints
  DOCUMENT_SERVICE: {
    name: 'Document Service',
    baseUrl: getServiceUrl('NEXT_PUBLIC_DOCUMENT_SERVICE_URL', 4002),
    endpoints: [
      '/attachments',
      '/attachments/*',
      // '/offers/*/documents'  // Specific pattern for offer documents
    ],
    description: 'Handles document uploads, library management, and file storage',
  },

  // Metadata Service (Port 3010)
  // MUST be defined BEFORE LEAD_OFFERS_SERVICE to catch metadata endpoints first
  METADATA_SERVICE: {
    name: 'Metadata Service',
    baseUrl: getServiceUrl('NEXT_PUBLIC_METADATA_SERVICE_URL', 3010),
    endpoints: ['/api/metadata/options', '/api/metadata/options/*'],
    description:
      'Handles metadata options for universal grouping and filtering (Lead, Offer, User, Team, Opening, Reclamation)',
  },

  // Lead-Offers Service (Port 4003)
  LEAD_OFFERS_SERVICE: {
    name: 'Lead-Offers Service',
    baseUrl: getServiceUrl('NEXT_PUBLIC_LEAD_OFFERS_SERVICE_URL', 4003),
    endpoints: [
      '/openings',
      '/openings/*',
      '/confirmations',
      '/confirmations/*',
      '/payment-vouchers',
      '/payment-vouchers/*',
      '/leads',
      '/leads/*',
      '/offers',
      '/offers/*',
      '/appointments',
      '/appointments/*',
      '/assign-leads',
      '/assign-leads/*',
      '/reclamations',
      '/reclamations/*',
      '/todos',
      '/todos/*',
      '/dynamic-filters',
      '/dynamic-filters/*',
      '/filters',
      '/filters/*',
      '/activities',
      '/activities/*',
      '/confirmations',
      '/payment-vouchers',
      '/lost-offers',
      '/search',
      '/search/*',
      '/todo-types',
      '/todo-types/*',
      '/api/todos/todo-types',
      '/api/todos/todo-types/*',
      '/document-slots',
      '/document-slots/*',
    ],
    description:
      'Handles leads management, offers, openings, confirmations, payment vouchers, appointments, lead assignments, reclamations, todos, filtering, and global search',
  },

  // Notification Service (Port 4004) - DISABLED: Using monolith on port 3000
  NOTIFICATION_SERVICE: {
    name: 'Notification Service',
    baseUrl: getServiceUrl('NEXT_PUBLIC_NOTIFICATION_SERVICE_URL', 4004),
    endpoints: [
      '/notifications',
      '/notifications/*',
      '/notification-rules',
      '/notification-rules/*',
      '/notification-audio',
      '/notification-audio/*',
    ],
    description:
      'Handles all notification operations including real-time notifications, read receipts, notification rules, notification audio, and notification management',
  },

  //PDF Service (Port 4009)
  PDF_SERVICE: {
    name: 'PDF Service',
    baseUrl: getServiceUrl('NEXT_PUBLIC_PDF_SERVICE_URL', 4009),
    endpoints: [
      '/admin/pdf-templates',
      '/admin/pdf-templates/*',
      '/admin/fonts',
      '/admin/fonts/*',
      '/pdf/generated/*',
      '/pdf/generate-offer',
      '/pdf/offer/*',
    ],
    description: 'Handles PDF generation for offers',
  },

  // Search Service (Port 3010)
  SEARCH_SERVICE: {
    name: 'Search Service',
    baseUrl: getServiceUrl('NEXT_PUBLIC_SEARCH_SERVICE_URL', 3010),
    endpoints: ['/api/search', '/api/search/*', '/api/metadata', '/api/metadata/*'],
    description: 'Universal query engine for cross-service search and grouping',
  },

  // Cashflow Service (Port 4011)
  CASHFLOW_SERVICE: {
    name: 'Cashflow Service',
    baseUrl: getServiceUrl('NEXT_PUBLIC_CASHFLOW_SERVICE_URL', 4011),
    endpoints: ['/cashflow', '/cashflow/*'],
    description: 'Handles cashflow tracking, bank transfers, and money movement between banks',
  },

  // Call Service (Port 4010)
  CALL_SERVICE: {
    name: 'Call Service',
    baseUrl: getServiceUrl('NEXT_PUBLIC_CALL_SERVICE_URL', 4010),
    endpoints: [
      '/calls',
      '/calls/*',
      '/monitoring',
      '/monitoring/*',
      '/recordings',
      '/recordings/*',
      '/cdr',
      '/cdr/*',
      '/routing',
      '/routing/*',
      '/freepbx',
      '/freepbx/*',
      '/freepbx-routing',
      '/freepbx-routing/*',
      '/freepbx-test',
      '/freepbx-test/*',
      '/transfer',
      '/transfer/*',
      '/voip',
      '/voip/*',
    ],
    description:
      'Handles FreePBX integration, call management, AMI, CDR, recordings, and call routing',
  },
  // Call Service (Port 4010)
  TODO_BOARD_SERVICE: {
    name: 'Todo board Service',
    baseUrl: getServiceUrl('NEXT_PUBLIC_TODO_SERVICE_URL', 5001),
    endpoints: [
      '/api/activities/*',
      '/api/boards/*',
      '/api/tasks/*',
      '/api/lists/*',
      '/api/internal-chat/*',
      '/api/predefined-subtasks/*',
      '/api/predefined-subtask-categories/*',
      '/api/labels/*',
      '/api/users/get-users',
    ],
    description: 'Handles Todo board management',
  },
  // Communication Service (Port 4020) - Discord-like messaging, voice, video
  COMMUNICATION_SERVICE: {
    name: 'Communication Service',
    baseUrl: getServiceUrl('NEXT_PUBLIC_COMMUNICATION_SERVICE_URL', 4020),
    endpoints: [
      '/api/servers',
      '/api/servers/*',
      '/api/channels',
      '/api/channels/*',
      '/api/dm',
      '/api/dm/*',
      '/api/invites',
      '/api/invites/*',
      '/api/calls',
      '/api/calls/*',
      '/api/users/profiles', // User profile resolution for communication service
    ],
    description: 'Discord-like communication service for messaging, voice, and video',
  },

  // LeadBot Service (Port 8000)
  LEAD_BOT_SERVICE: {
    name: 'LeadBot Service',
    baseUrl: getServiceUrl('NEXT_PUBLIC_LEAD_BOT_SERVICE_URL', 8000),
    endpoints: [
      '/api/classify-email',
      '/api/conversation',
      '/api/conversation/*',
      '/api/extract-document',
      '/api/audio',
      '/api/audio/*',
      '/api/quick-actions',
      '/api/quick-actions/*',
    ],
    description:
      'Handles LeadBot AI assistant: classification, document extraction, lead conversations, and audio-to-text',
  },

  // Monolith Backend (Port 3000) - Everything else until migrated
  MONOLITH: {
    name: 'Monolith Backend',
    baseUrl: getServiceUrl('NEXT_PUBLIC_API_BASE_URL', 3000),
    endpoints: ['*'], // Catches all other endpoints
    description: 'Legacy monolith backend for endpoints not yet migrated to microservices',
  },

  // Reportings Service (Port 4007)
  REPORTING_SERVICE: {
    name: 'Reporting Service',
    description: 'Handles reporting operations for business intelligence and analytics',
    baseUrl: getServiceUrl('NEXT_PUBLIC_REPORTING_SERVICE_URL', 4007),
    endpoints: ['/reports', '/reports/*'],
  },
};

/**
 * Leadbot API config (used by LeadbotService, LeadbotApiClient)
 * Base URL from LEAD_BOT_SERVICE, API key for X-API-Key header
 */
export const leadbotConfig = {
  baseUrl: MICROSERVICES.LEAD_BOT_SERVICE.baseUrl,
  apiKey:
    (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_LEADBOT_API_KEY : undefined) || '',
  mock:
    (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_LEADBOT_MOCK : undefined) === 'true',
} as const;

// test

/**
 * Route an API endpoint to the correct microservice
 * @param endpoint - The API endpoint path (e.g., '/auth/login', '/users/123')
 * @returns The base URL of the microservice that handles this endpoint
 *
 * @example
 * // Mail endpoints -> Port 4004
 * routeToMicroservice('/settings/mailservers') -> 'http://localhost:4004'
 * routeToMicroservice('/settings/mailservers/687637694d50758a86621866') -> 'http://localhost:4004'
 *
 * // Other settings -> Port 4006
 * routeToMicroservice('/settings') -> 'http://localhost:4006'
 * routeToMicroservice('/settings/other-config') -> 'http://localhost:4006'
 */
export const routeToMicroservice = (endpoint: string): string => {
  // Normalize the endpoint (remove query params, ensure leading slash)
  const normalizedEndpoint = endpoint.split('?')[0];
  const path = normalizedEndpoint.startsWith('/') ? normalizedEndpoint : `/${normalizedEndpoint}`;

  // Check each microservice for matching endpoints
  for (const [key, service] of Object.entries(MICROSERVICES)) {
    // Skip monolith for now (it's the fallback)
    if (key === 'MONOLITH') continue;

    for (const pattern of service.endpoints) {
      const matches = matchesPattern(path, pattern);
      if (matches) {
        return service.baseUrl;
      }
    }
  }
  return MICROSERVICES.MONOLITH.baseUrl;
};

/**
 * Check if a path matches a pattern
 * Supports wildcards for dynamic route segments
 */
function matchesPattern(path: string, pattern: string): boolean {
  // Exact match
  if (path === pattern) return true;

  // Wildcard match (pattern ends with /*)
  if (pattern.endsWith('/*')) {
    const basePattern = pattern.slice(0, -2); // Remove /*
    return path === basePattern || path.startsWith(basePattern + '/');
  }

  // Wildcard match with pattern in middle (e.g., /offers/*/documents)
  if (pattern.includes('/*/')) {
    const parts = pattern.split('/*/');
    if (parts.length === 2) {
      const prefix = parts[0];
      const suffix = parts[1];
      return path.startsWith(prefix + '/') && path.endsWith('/' + suffix);
    }
  }

  // Wildcard match (pattern is just *)
  if (pattern === '*') return true;

  return false;
}

/**
 * Get all configured microservices
 * Useful for debugging and monitoring
 */
export const getAllMicroservices = (): MicroserviceConfig[] => {
  return Object.values(MICROSERVICES);
};

/**
 * Check if microservices are enabled
 * Disable this in development if you want to use monolith only
 */
export const isMicroservicesEnabled = (): boolean => {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_USE_MICROSERVICES === 'false') {
    return false;
  }
  return true;
};

/**
 * Get the full URL for an API endpoint
 * Combines the microservice base URL with the endpoint path
 */
export const getFullApiUrl = (endpoint: string): string => {
  const baseUrl = routeToMicroservice(endpoint);
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${path}`;
};

export default {
  MICROSERVICES,
  routeToMicroservice,
  getAllMicroservices,
  isMicroservicesEnabled,
  getFullApiUrl,
};
