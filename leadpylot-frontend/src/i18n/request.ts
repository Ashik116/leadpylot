import { getRequestConfig } from 'next-intl/server';
import { getLocale } from '@/server/actions/locale';

export default getRequestConfig(async () => {
  const locale = await getLocale();
  const loaders: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
    en: () => import('../../messages/en.json'),
    // Add additional locales here as needed, e.g.:
    // es: () => import('../../messages/es.json'),
  };

  const loadMessages = loaders[locale] ?? loaders.en;

  if (!loadMessages) {
    throw new Error(`No messages loader configured for locale "${locale}"`);
  }

  const { default: messages } = await loadMessages();
  return {
    locale,
    messages,
  };
});
