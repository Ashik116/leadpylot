'use client';
import type { CommonProps } from '@/@types/common';
import type { Theme } from '@/@types/theme';
import ConfigProvider from '@/components/ui/ConfigProvider';
import appConfig from '@/configs/app.config';
import { COOKIES_KEY } from '@/constants/app.constant';
import { useState, useEffect } from 'react';
import ThemeContext from './ThemeContext';

interface ThemeProviderProps extends CommonProps {
  theme: Theme;
  locale?: string;
}

// Client-side function to set theme cookie
const setThemeCookie = (theme: Theme) => {
  if (typeof document !== 'undefined') {
    document.cookie = `${COOKIES_KEY.THEME}=${JSON.stringify({ state: theme })}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Strict`;
  }
};

const ThemeProvider = ({ children, theme, locale }: ThemeProviderProps) => {
  // Initialize theme from cookie using lazy initializer to avoid setState in effect
  const [themeState, setThemeState] = useState<Theme>(() => {
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';');
      const themeCookie = cookies.find((cookie) =>
        cookie.trim().startsWith(`${COOKIES_KEY.THEME}=`)
      );
      if (themeCookie) {
        try {
          const storedTheme = JSON.parse(themeCookie.split('=')[1]);
          if (storedTheme && storedTheme.state) {
            return storedTheme.state;
          }
        } catch (error) {
          // Silently fall back to default theme
        }
      }
    }
    return theme;
  });

  const handleSetTheme = async (payload: (param: Theme) => Theme | Theme) => {
    const setTheme = async (theme: Theme) => {
      setThemeState(theme);
      setThemeCookie(theme);
    };

    if (typeof payload === 'function') {
      const nextTheme = payload(themeState);
      await setTheme(nextTheme);
    } else {
      await setTheme(payload);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: themeState,
        setTheme: handleSetTheme,
      }}
    >
      <ConfigProvider
        value={{
          ...themeState,
          locale: locale || appConfig.locale,
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
