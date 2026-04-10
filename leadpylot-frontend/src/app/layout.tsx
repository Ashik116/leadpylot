import ThemeProvider from '@/components/template/Theme/ThemeProvider';
import NavigationProvider from '@/components/template/Navigation/NavigationProvider';
import { getTheme } from '@/server/actions/theme';
import type { ReactNode } from 'react';
import Script from 'next/script';
import '@/assets/styles/app.css';
import GlobalProviders from '@/components/providers';
import localFont from 'next/font/local';
import { Roboto } from 'next/font/google';
import LocaleProvider from '@/components/template/LocaleProvider';
import { getLocale, getMessages } from 'next-intl/server';
import { headers } from 'next/headers';
import { Metadata } from 'next';
import { getRouteMetadata } from '@/configs/page-meta.config';

const abcDiatype = localFont({
  src: [
    {
      path: '../../public/fonts/abc-diatype/ABCDiatype-Light.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../public/fonts/abc-diatype/ABCDiatype-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/abc-diatype/ABCDiatype-RegularItalic.woff2',
      weight: '400',
      style: 'italic',
    },
    {
      path: '../../public/fonts/abc-diatype/ABCDiatype-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/abc-diatype/ABCDiatype-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-abc-diatype',
});

const foundersGrotesk = localFont({
  src: [
    {
      path: '../../public/fonts/founders-grotesk/FoundersGrotesk-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-founders-grotesk',
});

const foundersGroteskMono = localFont({
  src: [
    {
      path: '../../public/fonts/founders-grotesk/FoundersGroteskMono-Regular.woff2',
      weight: '400',
      style: 'monospace',
    },
  ],
  variable: '--font-founders-grotesk-mono',
});

const apolloIcon = localFont({
  src: '../../public/fonts/icons/apollo-icons.woff',
  variable: '--font-apollo-icon',
});

const roboto = Roboto({
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  subsets: ['latin'],
  variable: '--font-roboto',
  display: 'swap',
});

const matter = localFont({
  src: [
    {
      path: '../../public/fonts/matter-font/Matter-Light.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../public/fonts/matter-font/Matter-LightItalic.ttf',
      weight: '300',
      style: 'italic',
    },
    {
      path: '../../public/fonts/matter-font/Matter-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/matter-font/Matter-RegularItalic.ttf',
      weight: '400',
      style: 'italic',
    },
    {
      path: '../../public/fonts/matter-font/Matter-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/matter-font/Matter-MediumItalic.ttf',
      weight: '500',
      style: 'italic',
    },
    {
      path: '../../public/fonts/matter-font/Matter-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../public/fonts/matter-font/Matter-SemiBoldItalic.ttf',
      weight: '600',
      style: 'italic',
    },
    {
      path: '../../public/fonts/matter-font/Matter-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../../public/fonts/matter-font/Matter-BoldItalic.ttf',
      weight: '700',
      style: 'italic',
    },
    {
      path: '../../public/fonts/matter-font/Matter-Heavy.ttf',
      weight: '800',
      style: 'normal',
    },
    {
      path: '../../public/fonts/matter-font/Matter-HeavyItalic.ttf',
      weight: '800',
      style: 'italic',
    },
  ],
  variable: '--font-matter',
});

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  // Get pathname from middleware header
  const pathname = headersList.get('x-pathname') || '/dashboards/leads';

  const routeMetadata = getRouteMetadata(pathname);

  return {
    ...routeMetadata,
    manifest: '/manifest.json',
    other: {
      ...(routeMetadata.other as Record<string, string> | undefined),
      'fcm-notifications': 'true',
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const theme = await getTheme();

  const locale = await getLocale();

  const messages = await getMessages();

  return (
    <html
      className={`${theme.mode === 'dark' ? 'dark' : 'light'} ${abcDiatype.variable} ${foundersGrotesk.variable} ${foundersGroteskMono.variable} ${apolloIcon.variable} ${roboto.variable} ${matter.variable}`}
      dir={theme.direction}
      suppressHydrationWarning
    >
      <body className={`${matter.className}`} suppressHydrationWarning>
        <Script src="/chunk-error-handler.js" strategy="beforeInteractive" />
        {/* Portal root for notification drawer so it stacks above Applied Filters (z 100001) */}
        <div />
        <GlobalProviders>
          <LocaleProvider locale={locale} messages={messages}>
            <ThemeProvider theme={theme}>
              <NavigationProvider>{children}</NavigationProvider>
            </ThemeProvider>
          </LocaleProvider>
        </GlobalProviders>
      </body>
    </html>
  );
}
