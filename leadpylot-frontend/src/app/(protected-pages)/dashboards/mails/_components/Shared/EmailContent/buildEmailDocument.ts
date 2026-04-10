/**
 * Builds the full HTML document for iframe srcdoc.
 * Keeps email styling isolated and consistent with app fonts.
 */

import {
  EMAIL_FONT_FAMILY,
  EMAIL_FONT_SIZE,
  FONT_PATHS,
} from './emailContent.config';

function getFontFaceCSS(): string {
  return [
    { weight: 400, path: FONT_PATHS.regular },
    { weight: 500, path: FONT_PATHS.medium },
    { weight: 600, path: FONT_PATHS.semiBold },
    { weight: 700, path: FONT_PATHS.bold },
  ]
    .map(
      ({ weight, path }) =>
        `@font-face{font-family:${EMAIL_FONT_FAMILY};src:url('${path}') format('truetype');font-weight:${weight};font-style:normal}`
    )
    .join('');
}

function getScrollbarStyles(): string {
  return `html,body{scrollbar-width:thin;scrollbar-color:rgba(156,163,175,0.5) transparent}
html::-webkit-scrollbar,body::-webkit-scrollbar{width:6px;height:6px}
html::-webkit-scrollbar-track,body::-webkit-scrollbar-track{background:transparent}
html::-webkit-scrollbar-thumb,body::-webkit-scrollbar-thumb{background-color:rgba(156,163,175,0.5);border-radius:4px}
html::-webkit-scrollbar-thumb:hover,body::-webkit-scrollbar-thumb:hover{background-color:rgba(156,163,175,0.7)}
html::-webkit-scrollbar-corner,body::-webkit-scrollbar-corner{background:transparent}`;
}

function getBodyStyles(): string {
  return `html,body{height:auto!important;min-height:0!important;margin:0;padding:0}
body{font-family:${EMAIL_FONT_FAMILY},sans-serif;font-size:${EMAIL_FONT_SIZE};font-weight:400;font-variant:normal;color:#000;padding-top:0.5rem}
img{max-width:100%;height:auto}
a{color:#2563eb;text-decoration:underline}
a:visited{color:#7c3aed}
a:hover{color:#1d4ed8}`;
}

/**
 * Wraps sanitized email HTML in a full document for iframe rendering.
 */
export function buildEmailDocument(html: string): string {
  const fontFaces = getFontFaceCSS();
  const bodyStyles = getBodyStyles();

  const scrollbarStyles = getScrollbarStyles();
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>${fontFaces}${bodyStyles}${scrollbarStyles}</style>
</head>
<body>${html}</body>
</html>`;
}
