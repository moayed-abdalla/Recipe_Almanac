'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabaseClient } from '@/lib/supabase-client';

type FeedbackType = 'bug' | 'feature' | 'other';

const FEEDBACK_BUCKET = 'feedback-attachments';

function FeedbackPageContent() {
  const searchParams = useSearchParams();

  const initialType = useMemo<FeedbackType>(() => {
    const param = searchParams.get('type');
    if (param === 'feature') return 'feature';
    if (param === 'other') return 'other';
    return 'bug';
  }, [searchParams]);

  const [user, setUser] = useState<User | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);

  const [type, setType] = useState<FeedbackType>(initialType);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setType(initialType);
  }, [initialType]);

  useEffect(() => {
    const fetchUser = async () => {
      setLoadingUser(true);
      try {
        const { data, error: userError } = await supabaseClient.auth.getUser();
        if (userError) {
          console.error('Error fetching user:', userError);
          setUser(null);
          setIsVerified(false);
          return;
        }

        setUser(data.user ?? null);
        const verified = Boolean(
          data.user?.email_confirmed_at ||
          data.user?.user_metadata?.email_verified ||
          data.user?.phone_confirmed_at
        );
        setIsVerified(verified);
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUser();

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      const verified = Boolean(
        nextUser?.email_confirmed_at ||
        nextUser?.user_metadata?.email_verified ||
        nextUser?.phone_confirmed_at
      );
      setIsVerified(verified);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      setSubmitLoading(true);

      const { data, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !data.user) {
        throw new Error('Please log in to submit feedback.');
      }
      const currentUser = data.user;
      const verified = Boolean(
        currentUser.email_confirmed_at ||
        currentUser.user_metadata?.email_verified ||
        currentUser.phone_confirmed_at
      );
      if (!verified) {
        throw new Error('Please verify your account before submitting feedback.');
      }

      let imageUrl: string | null = null;
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop() || 'png';
        const path = `${currentUser.id}/feedback-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabaseClient.storage
          .from(FEEDBACK_BUCKET)
          .upload(path, imageFile);

        if (uploadError) {
          throw new Error(`Image upload failed: ${uploadError.message}`);
        }

        const { data: publicData } = supabaseClient.storage
          .from(FEEDBACK_BUCKET)
          .getPublicUrl(path);

        imageUrl = publicData.publicUrl;
      }

      const { error: insertError } = await supabaseClient
        .from('feedback')
        .insert({
          user_id: currentUser.id,
          type,
          subject: subject || null,
          description,
          image_url: imageUrl,
        });

      if (insertError) {
        throw new Error(`Could not submit feedback: ${insertError.message}`);
      }

      setSuccess('Thanks! Your submission has been received.');
      setSubject('');
      setDescription('');
      setImageFile(null);
      setImagePreview(null);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const renderStatus = () => {
    if (loadingUser) {
      return (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-lg" aria-label="Loading"></span>
        </div>
      );
    }

    if (!user) {
      return (
        <div className="alert alert-warning">
          <div>
            <span>You need to log in to submit feedback.</span>
          </div>
          <div className="flex gap-2">
            <Link className="btn btn-sm btn-primary" href="/login">Log in</Link>
            <Link className="btn btn-sm btn-outline" href="/register">Create account</Link>
          </div>
        </div>
      );
    }

    if (!isVerified) {
      return (
        <div className="alert alert-info">
          <span>Please verify your email to submit feedback. Check your inbox for the verification link.</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <div className="mb-6">
        <p className="text-sm uppercase font-semibold tracking-wide text-primary">Feedback</p>
        <h1 className="text-4xl font-bold mt-2 leading-tight">Report a bug or request a feature</h1>
        <p className="mt-2 text-base opacity-80">
          Help us improve Recipe Almanac. Choose the type, add details, and (optionally) include a screenshot.
        </p>
      </div>

      {renderStatus()}

      <form onSubmit={handleSubmit} className="card bg-base-100 shadow-lg border border-base-300">
        <div className="card-body space-y-4">
          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="alert alert-success">
              <span>{success}</span>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Type *</span>
              </label>
              <select
                className="select select-bordered"
                value={type}
                onChange={(e) => setType(e.target.value as FeedbackType)}
              >
                <option value="bug">Bug</option>
                <option value="feature">Feature request</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Subject</span>
                <span className="label-text-alt">Optional</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                placeholder="Short summary"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Details *</span>
            </label>
            <textarea
              className="textarea textarea-bordered min-h-[160px]"
              placeholder="What happened? Steps to reproduce? What would you like to see?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <label className="label">
              <span className="label-text-alt">Include links or steps to reproduce if reporting a bug.</span>
            </label>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Screenshot or image</span>
              <span className="label-text-alt">Optional</span>
            </label>
            {imagePreview && (
              <div className="mb-3">
                <img
                  src={imagePreview}
                  alt="Attachment preview"
                  className="rounded-lg border border-base-300 max-h-56 object-contain"
                />
                <p className="text-xs opacity-70 mt-1">Preview</p>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              className="file-input file-input-bordered"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setImageFile(file);
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => setImagePreview(ev.target?.result as string);
                  reader.readAsDataURL(file);
                } else {
                  setImagePreview(null);
                }
              }}
            />
          </div>

          <div className="form-control pt-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!user || !isVerified || submitLoading}
            >
              {submitLoading ? 'Submitting...' : 'Submit feedback'}
            </button>
            {(!user || !isVerified) && (
              <span className="label-text-alt mt-2">
                You must be logged in and verified to submit.
              </span>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-10">
        <span className="loading loading-spinner loading-lg" aria-label="Loading"></span>
      </div>
    }>
      <FeedbackPageContent />
    </Suspense>
  );
}

