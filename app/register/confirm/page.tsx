'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { supabaseClient } from '@/lib/supabase-client';

function ConfirmContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  const [resendState, setResendState] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [resendError, setResendError] = useState('');

  const handleResend = async () => {
    if (!email) return;
    setResendState('loading');
    setResendError('');

    const { error } = await supabaseClient.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      setResendError(error.message);
      setResendState('error');
    } else {
      setResendState('sent');
    }
  };

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

            <div className="text-sm text-base-content/60 space-y-2">
              <p>Didn&apos;t receive an email?</p>
              <p>Check your spam folder or{' '}
                {email ? (
                  <button
                    className="link link-primary"
                    onClick={handleResend}
                    disabled={resendState === 'loading' || resendState === 'sent'}
                  >
                    {resendState === 'loading' ? 'Sending…' : 'resend email'}
                  </button>
                ) : (
                  <Link href="/register" className="link link-primary">
                    try registering again
                  </Link>
                )}
                .
              </p>

              {resendState === 'sent' && (
                <p className="text-success font-medium">Email resent! Check your inbox.</p>
              )}
              {resendState === 'error' && (
                <p className="text-error">{resendError}</p>
              )}
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
