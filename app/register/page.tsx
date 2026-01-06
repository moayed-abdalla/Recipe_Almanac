'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseClient } from '@/lib/supabase-client';
import { containsBadWords, getBadWordErrorMessage } from '@/utils/badWords';
import { LIGHT_THEMES, DARK_THEMES, DEFAULT_LIGHT_THEME, DEFAULT_DARK_THEME, type LightThemeId, type DarkThemeId } from '@/lib/theme-config';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedLightTheme, setSelectedLightTheme] = useState<LightThemeId>(DEFAULT_LIGHT_THEME);
  const [selectedDarkTheme, setSelectedDarkTheme] = useState<DarkThemeId>(DEFAULT_DARK_THEME);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    // Validate email is provided
    if (!email || email.trim() === '') {
      setError('Email is required');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Validate username doesn't contain bad words
    if (containsBadWords(username)) {
      setError(getBadWordErrorMessage());
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Sign up with Supabase Auth
      const { data, error: signUpError } = await supabaseClient.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            username,
          },
        },
      });

      if (signUpError) throw signUpError;

      // Profile will be created automatically by the database trigger
      // But we can update it with the username and theme preferences
      if (data.user) {
        // Update profile with username and theme preferences
        const { error: profileError } = await supabaseClient
          .from('profiles')
          .update({ 
            username,
            default_light_theme: selectedLightTheme,
            default_dark_theme: selectedDarkTheme,
          })
          .eq('id', data.user.id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }

        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">Create Account</h1>
        
        <form onSubmit={handleRegister} className="card bg-base-200 shadow-xl">
          <div className="card-body">
            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            )}

            <div className="form-control">
              <label className="label">
                <span className="label-text">Username</span>
              </label>
              <input
                type="text"
                placeholder="username"
                className="input input-bordered"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                required
                minLength={3}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Email</span>
                <span className="label-text-alt">Required for sign in</span>
              </label>
              <input
                type="email"
                placeholder="email@example.com"
                className="input input-bordered"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Password</span>
              </label>
              <input
                type="password"
                placeholder="password"
                className="input input-bordered"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Confirm Password</span>
              </label>
              <input
                type="password"
                placeholder="confirm password"
                className="input input-bordered"
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {/* Theme Selection */}
            <div className="form-control mt-6">
              <label className="label">
                <span className="label-text font-semibold text-lg">Choose Your Themes</span>
              </label>
              
              {/* Light Themes */}
              <div className="mb-4">
                <h3 className="text-md font-semibold mb-3">Light Theme</h3>
                <div className="flex flex-wrap gap-4">
                  {LIGHT_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setSelectedLightTheme(theme.id as LightThemeId)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all w-30 ${
                        selectedLightTheme === theme.id
                          ? 'border-primary bg-primary/10'
                          : 'border-base-300 hover:border-primary/50'
                      }`}
                    >
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-base-content/20 shadow-md">
                        <div className="w-full h-full flex">
                          <div
                            className="w-1/2 h-full"
                            style={{ backgroundColor: theme.color1 }}
                          />
                          <div
                            className="w-1/2 h-full"
                            style={{ backgroundColor: theme.color2 }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium">{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dark Themes */}
              <div className="mb-4">
                <h3 className="text-md font-semibold mb-3">Dark Theme</h3>
                <div className="flex flex-wrap gap-4">
                  {DARK_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setSelectedDarkTheme(theme.id as DarkThemeId)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all w-30 ${
                        selectedDarkTheme === theme.id
                          ? 'border-primary bg-primary/10'
                          : 'border-base-300 hover:border-primary/50'
                      }`}
                    >
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-base-content/20 shadow-md">
                        <div className="w-full h-full flex">
                          <div
                            className="w-1/2 h-full"
                            style={{ backgroundColor: theme.color1 }}
                          />
                          <div
                            className="w-1/2 h-full"
                            style={{ backgroundColor: theme.color2 }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium">{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-control mt-6">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Register'}
              </button>
            </div>

            <div className="text-center mt-4">
              <p className="text-sm">
                Already have an account?{' '}
                <Link href="/login" className="link link-primary">
                  Log in here
                </Link>
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

