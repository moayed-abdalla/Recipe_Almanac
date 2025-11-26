import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Recipe Almanac',
  description: 'A digital recipe book you can share, browse and write your own. No ads, no subscriptions, just recipes.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light">
      <body>
        <Header />
        <main className="min-h-screen bg-base-100 text-base-content">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

