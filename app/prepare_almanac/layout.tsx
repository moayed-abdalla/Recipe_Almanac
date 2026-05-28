import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Prepare Your Recipe Almanac',
  description:
    'Select the recipes you would like to include in your personal Recipe Almanac and download it as a beautifully branded PDF cookbook.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function PrepareAlmanacLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
