/**
 * Feed Page
 *
 * A personalised feed of recent public recipes. Signed-in users can filter by:
 * - Following: recent recipes from people they follow
 * - Favourite Tags: recipes that share tags with recipes they favourited or
 *   rated 5 stars (tags are chosen via a popup)
 * - Favorites: recipes they have favourited
 * - Random: a random selection of public recipes
 *
 * The page itself is a thin server shell (for metadata); all interactivity and
 * data fetching lives in FeedClient, which also gates on the auth state.
 */

import type { Metadata } from 'next';
import FeedClient from './FeedClient';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://recipealmanac.xyz';

export const metadata: Metadata = {
  title: 'Your Feed',
  description:
    'A personalised feed of recent recipes from creators you follow and food that matches your taste on Recipe Almanac.',
  alternates: {
    canonical: `${siteUrl}/feed`,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = 'force-dynamic';

export default function FeedPage() {
  return <FeedClient />;
}
