import { NextResponse } from 'next/server';

const manifest = {
  name: 'LeadPylot',
  short_name: 'LeadPylot',
  description: 'LeadPylot - Lead Management System',
  start_url: '/',
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#ffffff',
  icons: [
    {
      src: '/web-app-manifest-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'maskable',
    },
    {
      src: '/web-app-manifest-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
  gcm_sender_id: '471197457341',
  gcm_user_visible_only: true,
} as const;

export function GET() {
  return NextResponse.json(manifest);
}
