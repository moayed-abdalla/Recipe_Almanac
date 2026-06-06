import type { Metadata } from 'next';
import HomePage from './HomePage';

export const dynamic = 'force-dynamic';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://recipealmanac.xyz';

export const metadata: Metadata = {
  title: 'Recipe Almanac — Free Digital Recipe Book',
  description:
    'Recipe Almanac is a free digital recipe book to write, share, and discover easy recipes. Browse community recipes, build your personal cookbook online — no ads, no subscriptions.',
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: 'Recipe Almanac — Free Digital Recipe Book',
    description:
      'Write, share and discover free easy recipes. Build your personal digital cookbook on Recipe Almanac — no ads, no subscriptions.',
    url: siteUrl,
  },
  twitter: {
    title: 'Recipe Almanac — Free Digital Recipe Book',
    description:
      'Write, share and discover free easy recipes. Build your personal digital cookbook on Recipe Almanac — no ads, no subscriptions.',
  },
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Recipe Almanac',
  alternateName: ['Recipe Almanac', 'RecipeAlmanac'],
  url: siteUrl,
  description:
    'A free digital recipe book to write, share, and discover easy recipes online.',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${siteUrl}/?search={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Recipe Almanac',
  url: siteUrl,
  logo: `${siteUrl}/icon-512.png`,
  description:
    'Recipe Almanac is a free digital recipe book and recipe sharing community.',
  sameAs: [],
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <HomePage />
    </>
  );
}
