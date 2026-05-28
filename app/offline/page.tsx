import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Offline',
  description: 'You are currently offline.',
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center">
      <div className="card bg-base-200 shadow-xl max-w-md w-full">
        <div className="card-body items-center text-center">
          <span className="badge badge-warning badge-lg mb-2">Offline</span>
          <h1 className="card-title special-elite-regular text-2xl text-base-content">
            You are offline
          </h1>
          <p className="text-base-content/80">
            This page has not been saved for offline use. Recipes you have
            favourited and opened before will still be available while you have
            no connection.
          </p>
          <p className="text-sm text-base-content/60">
            Reconnect to the internet to browse everything again.
          </p>
          <div className="card-actions mt-4 w-full flex-col sm:flex-row justify-center">
            <Link href="/almanac" className="btn btn-primary w-full sm:w-auto">
              My Almanac
            </Link>
            <Link href="/" className="btn btn-outline btn-primary w-full sm:w-auto">
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
