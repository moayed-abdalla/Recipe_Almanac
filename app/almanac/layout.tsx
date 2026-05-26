import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Almanac',
  description:
    'Your personal digital recipe collection — view your favourited, public, and private recipes in one place on Recipe Almanac.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AlmanacLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
