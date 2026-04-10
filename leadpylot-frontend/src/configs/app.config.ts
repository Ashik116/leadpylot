export type AppConfig = {
  apiPrefix: string;
  authenticatedEntryPath: string;
  unAuthenticatedEntryPath: string;
  locale: string;
  activeNavTranslation: boolean;
};
const apiPrefix = process.env.NEXT_PUBLIC_API_BASE_URL;
if (!apiPrefix) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set');
}
const appConfig: AppConfig = {
  apiPrefix,
  authenticatedEntryPath: '/', // Let middleware handle role-based routing
  unAuthenticatedEntryPath: '/sign-in',
  locale: 'en',
  activeNavTranslation: true,
};

export default appConfig;
