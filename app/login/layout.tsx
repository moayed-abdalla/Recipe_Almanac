import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://recipealmanac.com';

export const metadata: Metadata = {
  title: 'Log In',
  description:
    'Log in to Recipe Almanac — your personal digital recipe book. Access your recipes, favourites, and cookbook collection.',
  alternates: {
    canonical: `${siteUrl}/login`,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
