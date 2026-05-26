import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BackgroundMaskPositions from '@/components/BackgroundMaskPositions';
import AppProviders from '@/components/providers/AppProviders';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://recipealmanac.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Recipe Almanac — Your Digital Recipe Book',
    template: '%s | Recipe Almanac',
  },
  description:
    'Recipe Almanac is the ultimate digital recipe book to write, share, copy, and discover recipes. Browse community recipes, check the leaderboard, and build your personal cookbook — no ads, no subscriptions.',
  keywords: [
    'Recipe Almanac',
    'digital recipe book',
    'recipe sharing',
    'online cookbook',
    'share recipes',
    'copy recipes',
    'recipe leaderboard',
    'free recipe website',
    'community recipes',
    'write recipes online',
    'personal recipe collection',
    'recipe organiser',
  ],
  authors: [{ name: 'Recipe Almanac', url: siteUrl }],
  creator: 'Recipe Almanac',
  publisher: 'Recipe Almanac',
  category: 'food',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Recipe Almanac',
    title: 'Recipe Almanac — Your Digital Recipe Book',
    description:
      'Write, share, discover and copy recipes. Build your personal digital cookbook on Recipe Almanac — the community recipe website with no ads and no subscriptions.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Recipe Almanac — Your Digital Recipe Book',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Recipe Almanac — Your Digital Recipe Book',
    description:
      'Write, share, discover and copy recipes. Build your personal digital cookbook on Recipe Almanac.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light-orange" suppressHydrationWarning>
      <head>
        <Script id="theme-boot" strategy="beforeInteractive">
          {`(function(){try{var s=localStorage.getItem('theme-mode');var mode=s||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');var id=mode==='dark'?'dark-orange':'light-orange';document.documentElement.setAttribute('data-theme',id);document.documentElement.setAttribute('data-theme-mode',mode);}catch(e){}})();`}
        </Script>
        <link rel="icon" href="/favicon_light.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Special+Elite&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-base-100 text-base-content min-h-screen flex flex-col">
        <AppProviders>
          <BackgroundMaskPositions />
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-VXFFHEPYS9"
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-VXFFHEPYS9');
          `}
          </Script>
          <Header />
          <main className="flex-1 relative z-10 min-w-0 overflow-x-clip">
            {children}
          </main>
          <Footer />
        </AppProviders>
      </body>
    </html>
  );
}

