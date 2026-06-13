import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import Script from 'next/script';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BackgroundMaskPositions from '@/components/BackgroundMaskPositions';
import AppProviders from '@/components/providers/AppProviders';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://recipealmanac.xyz';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Recipe Almanac — Free Digital Recipe Book',
    template: '%s | Recipe Almanac',
  },
  description:
    'Recipe Almanac is a free digital recipe book to write, share, and discover easy recipes. Browse community recipes, build your personal cookbook online — no ads, no subscriptions.',
  keywords: [
    'Recipe Almanac',
    'recipe almanac',
    'free recipes',
    'easy recipes',
    'digital recipe book',
    'recipe master',
    'online cookbook',
    'recipe sharing',
    'share recipes',
    'copy recipes',
    'free recipe website',
    'community recipes',
    'write recipes online',
    'personal recipe collection',
    'recipe organiser',
    'recipe book online',
    'discover recipes',
    'recipe collection',
    'homemade recipes',
    'cooking recipes',
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
    title: 'Recipe Almanac — Free Digital Recipe Book',
    description:
      'Write, share, discover and copy free easy recipes. Build your personal digital cookbook on Recipe Almanac — no ads, no subscriptions.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Recipe Almanac — Free Digital Recipe Book',
    description:
      'Write, share and discover free easy recipes. Build your personal digital cookbook on Recipe Almanac.',
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
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Recipe Almanac',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#CC5500',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="tangerine-light" suppressHydrationWarning>
      <head>
        <Script id="theme-boot" strategy="beforeInteractive">
          {`(function(){try{
            var mode=localStorage.getItem('theme-mode')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
            var t=localStorage.getItem('guest-theme');
            if(!t){
              var ol=localStorage.getItem('guest-light-theme');
              var od=localStorage.getItem('guest-dark-theme');
              if(ol||od){localStorage.removeItem('guest-light-theme');localStorage.removeItem('guest-dark-theme');}
              t='tangerine';
              localStorage.setItem('guest-theme',t);
            }
            document.documentElement.setAttribute('data-theme',t+'-'+mode);
            document.documentElement.setAttribute('data-theme-mode',mode);
          }catch(e){}})();`}
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
        <Analytics />
      </body>
    </html>
  );
}

