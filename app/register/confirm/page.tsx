'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ConfirmContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto text-center">
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body items-center gap-6 py-12">
            <div className="text-6xl">📬</div>

            <div>
              <h1 className="text-3xl font-bold mb-3">Check your email</h1>
              <p className="text-base-content/70">
                We sent a confirmation link to
              </p>
              {email && (
                <p className="font-semibold mt-1 break-all">{email}</p>
              )}
            </div>

            <p className="text-base-content/60 text-sm max-w-xs">
              Click the link in the email to activate your account. The link will expire after 24 hours.
            </p>

            <div className="divider w-full my-0" />

            <div className="text-sm text-base-content/60 space-y-1">
              <p>Didn&apos;t receive an email?</p>
              <p>Check your spam folder or{' '}
                <Link href="/register" className="link link-primary">
                  try registering again
                </Link>
                .
              </p>
            </div>

            <Link href="/login" className="btn btn-outline btn-sm mt-2">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterConfirmPage() {
  return (
    <Suspense>
      <ConfirmContent />
    </Suspense>
  );
}
