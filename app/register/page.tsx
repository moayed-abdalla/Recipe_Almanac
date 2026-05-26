'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseClient } from '@/lib/supabase-client';
import { containsBadWords, getBadWordErrorMessage } from '@/utils/badWords';
import { LIGHT_THEMES, DARK_THEMES, DEFAULT_LIGHT_THEME, DEFAULT_DARK_THEME, type LightThemeId, type DarkThemeId } from '@/lib/theme-config';
import { DEFAULT_UNIT, type UnitValue } from '@/lib/unit-config';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedLightTheme, setSelectedLightTheme] = useState<LightThemeId>(DEFAULT_LIGHT_THEME);
  const [selectedDarkTheme, setSelectedDarkTheme] = useState<DarkThemeId>(DEFAULT_DARK_THEME);
  const [selectedUnit, setSelectedUnit] = useState<UnitValue>(DEFAULT_UNIT);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const getCurrentThemeMode = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    const savedThemeMode = localStorage.getItem('theme-mode') as 'light' | 'dark' | null;
    if (savedThemeMode) return savedThemeMode;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const updateFavicon = (mode: 'light' | 'dark') => {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = mode === 'dark' ? '/favicon_dark.ico' : '/favicon_light.ico';
  };

  const applyThemePreview = (
    lightTheme: LightThemeId,
    darkTheme: DarkThemeId,
    mode: 'light' | 'dark'
  ) => {
    const themeId = mode === 'light' ? lightTheme : darkTheme;
    document.documentElement.setAttribute('data-theme', themeId);
    document.documentElement.setAttribute('data-theme-mode', mode);
    localStorage.setItem('theme-mode', mode);
    localStorage.setItem('guest-light-theme', lightTheme);
    localStorage.setItem('guest-dark-theme', darkTheme);
    updateFavicon(mode);
  };

  const handleSelectLightTheme = (themeId: LightThemeId) => {
    setSelectedLightTheme(themeId);
    applyThemePreview(themeId, selectedDarkTheme, 'light');
  };

  const handleSelectDarkTheme = (themeId: DarkThemeId) => {
    setSelectedDarkTheme(themeId);
    applyThemePreview(selectedLightTheme, themeId, 'dark');
  };

  useEffect(() => {
    const mode = getCurrentThemeMode();
    applyThemePreview(selectedLightTheme, selectedDarkTheme, mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply guest defaults once on mount
  }, []);

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
            default_unit: selectedUnit,
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

  const handleGoogleRegister = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/`;
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });

      if (error) throw error;
    } catch (err: unknown) {
      const oauthError = err as { message?: string };
      setError(oauthError.message || 'An error occurred during Google sign up');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-6 sm:mb-8">Create Account</h1>
        
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {LIGHT_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleSelectLightTheme(theme.id as LightThemeId)}
                      className={`flex flex-col items-center gap-2 p-2 sm:p-3 rounded-lg border-2 transition-all w-full ${
                        selectedLightTheme === theme.id
                          ? 'border-primary bg-primary/10'
                          : 'border-base-300 hover:border-primary/50'
                      }`}
                    >
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-base-content/20 shadow-md">
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {DARK_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleSelectDarkTheme(theme.id as DarkThemeId)}
                      className={`flex flex-col items-center gap-2 p-2 sm:p-3 rounded-lg border-2 transition-all w-full ${
                        selectedDarkTheme === theme.id
                          ? 'border-primary bg-primary/10'
                          : 'border-base-300 hover:border-primary/50'
                      }`}
                    >
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-base-content/20 shadow-md">
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

            {/* Default Unit of Measurement */}
            <div className="form-control mt-6">
              <label className="label">
                <span className="label-text font-semibold text-lg">Default Unit of Measurement</span>
              </label>
              <label className="label">
                <span className="label-text-alt">This will be pre-selected when you create recipes</span>
              </label>
              <select
                className="select select-bordered"
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value as UnitValue)}
              >
                <optgroup label="Weight - Metric">
                  <option value="g">g (grams)</option>
                  <option value="kg">kg (kilograms)</option>
                </optgroup>
                <optgroup label="Weight - Imperial">
                  <option value="oz">oz (ounces)</option>
                  <option value="lb">lb (pounds)</option>
                </optgroup>
                <optgroup label="Volume">
                  <option value="cups">cups</option>
                  <option value="tbsp">tbsp (tablespoon)</option>
                  <option value="tsp">tsp (teaspoon)</option>
                  <option value="ml">ml (milliliters)</option>
                  <option value="fl oz">fl oz (fluid ounces)</option>
                  <option value="l">l (liters)</option>
                </optgroup>
                <optgroup label="Other">
                  <option value="other">Other</option>
                </optgroup>
              </select>
            </div>

            <div className="form-control mt-6">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || googleLoading}
              >
                {loading ? 'Creating account...' : 'Register'}
              </button>
            </div>

            <div className="divider my-2">OR</div>

            <div className="form-control">
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleGoogleRegister}
                disabled={loading || googleLoading}
              >
                {googleLoading ? 'Redirecting to Google...' : 'Continue with Google'}
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

