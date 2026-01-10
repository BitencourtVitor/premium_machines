import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Premium Machines',
  description: 'Machine Management System with Geolocation - Premium Machines',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Machines',
  },
  icons: {
    icon: [
      { url: '/icon_machines_192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon_machines_512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon-180.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/icon_machines_192.png',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'Machines',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className="transition-colors duration-250 ease-in-out">
      <head>
        <link href='https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.css' rel='stylesheet' />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedTheme = localStorage.getItem('theme');
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
                  
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                  
                  const logoSrc = isDark ? '/premium_logo_vetorizado_white.png' : '/premium_logo_vetorizado.png';
                  localStorage.setItem('logoSrc', logoSrc);
                } catch (e) {
                  console.error('Error applying theme:', e);
                }
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="bg-gray-50 dark:bg-gray-900 transition-colors duration-250 ease-in-out">
        {children}
      </body>
    </html>
  )
}
