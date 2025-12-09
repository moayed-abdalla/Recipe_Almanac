import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Recipe Almanac',
  description: 'Your digital recipe book you can share, browse and write your own. No ads, no subscriptions, just recipes.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="icon" href="/favicon_light.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Special+Elite&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-base-100 text-base-content">
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
        <main className="min-h-screen relative z-10">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

