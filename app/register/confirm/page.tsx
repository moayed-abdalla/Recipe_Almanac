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
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Branding */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="logo-colorized w-16 h-16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Recipe Almanac logo" className="w-full h-full" />
          </div>
          <span className="special-elite-regular text-2xl text-base-content">Recipe Almanac</span>
        </div>

        {/* Card */}
        <div className="card bg-base-200 shadow-xl border border-base-300">
          <div className="card-body gap-6 px-8 py-10">

            {/* Heading */}
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Confirm your email address</h1>
              <p className="text-base-content/65 text-sm leading-relaxed">
                We&apos;ve sent a confirmation link to
              </p>
              {email && (
                <p className="font-semibold mt-1 break-all">{email}</p>
              )}
            </div>

            <div className="divider my-0" />

            {/* Steps */}
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-content flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                <span className="text-base-content/80">Open your inbox and find the email from <strong>Recipe Almanac</strong>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-content flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                <span className="text-base-content/80">Click the <strong>Confirm your account</strong> button inside the email.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-content flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                <span className="text-base-content/80">You&apos;ll be signed in automatically and taken to your new account.</span>
              </li>
            </ol>

            <div className="divider my-0" />

            {/* Privacy note */}
            <div className="bg-base-300/50 rounded-lg px-4 py-3 text-xs text-base-content/60 leading-relaxed">
              <p className="font-semibold text-base-content/80 mb-1">How we use your email</p>
              <p>
                Your email address is used solely for account verification and essential account-related
                notifications (such as password resets). We will <strong>never</strong> send you marketing
                emails or share your address with third parties.
              </p>
            </div>

            {/* Resend section */}
            <div className="text-center space-y-2">
              <p className="text-sm text-base-content/60">Didn&apos;t receive an email? Check your spam folder or</p>

              {email ? (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={handleResend}
                  disabled={resendState === 'loading' || resendState === 'sent'}
                >
                  {resendState === 'loading' ? (
                    <><span className="loading loading-spinner loading-xs" /> Sending…</>
                  ) : resendState === 'sent' ? (
                    'Email sent!'
                  ) : (
                    'Resend confirmation email'
                  )}
                </button>
              ) : (
                <Link href="/register" className="btn btn-outline btn-sm">
                  Try registering again
                </Link>
              )}

              {resendState === 'sent' && (
                <p className="text-success text-xs">A new confirmation link has been sent to your inbox.</p>
              )}
              {resendState === 'error' && (
                <p className="text-error text-xs">{resendError}</p>
              )}
            </div>

            <div className="text-center">
              <Link href="/login" className="link link-primary text-sm">
                Back to login
              </Link>
            </div>

          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-base-content/40 mt-6">
          The confirmation link expires after 24 hours.
        </p>
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
