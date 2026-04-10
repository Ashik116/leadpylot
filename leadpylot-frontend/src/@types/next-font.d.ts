declare module 'next/font/local' {
  interface LocalFont {
    src: string | Array<{ path: string; weight?: string; style?: string }>;
    display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
    weight?: string;
    style?: string;
    subsets?: string[];
    variable?: string;
    preload?: boolean;
    adjustFontFallback?: 'Arial' | 'Times New Roman' | false;
    declarations?: Array<{ prop: string; value: string }>;
  }

  export default function localFont(options: LocalFont): {
    className: string;
    variable: string;
    style: { fontFamily: string; fontWeight?: number; fontStyle?: string };
  };
}

declare module 'next/font/google' {
  export function Roboto(options: any): {
    className: string;
    variable: string;
    style: { fontFamily: string; fontWeight?: number; fontStyle?: string };
  };
  // Add other fonts if needed, or a catch-all if possible
  // Since we can't easily list all google fonts, we can add them as needed
  // or use a broader declaration.
}
