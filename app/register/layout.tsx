import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://recipealmanac.xyz';

export const metadata: Metadata = {
  title: 'Create Account',
  description:
    'Join Recipe Almanac for free — the digital recipe book where you can write, share, copy and discover recipes. No ads, no subscriptions.',
  keywords: [
    'recipe website signup',
    'create recipe account',
    'free recipe book',
    'Recipe Almanac register',
    'digital cookbook sign up',
  ],
  openGraph: {
    type: 'website',
    url: `${siteUrl}/register`,
    title: 'Create a Free Account | Recipe Almanac',
    description:
      'Join Recipe Almanac — write, share, and discover recipes in your own digital cookbook.',
    siteName: 'Recipe Almanac',
  },
  alternates: {
    canonical: `${siteUrl}/register`,
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
