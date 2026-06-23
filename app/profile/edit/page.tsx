'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import {
  DEFAULT_THEME,
  resolveDaisyThemeId,
  getUnifiedTheme,
  migrateGuestThemePrefs,
  type ThemeId,
} from '@/lib/theme-config';
import ThemePicker from '@/components/ThemePicker';
import { DEFAULT_UNIT, type UnitValue } from '@/lib/unit-config';
import {
  DEFAULT_TEMPERATURE_UNIT,
  TEMPERATURE_OPTIONS,
  type TemperatureUnitValue,
} from '@/lib/temperature-config';
import type { Profile } from '@/types';
import {
  validateProfileDescription,
  validateUsername,
  PROFILE_DESCRIPTION_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from '@/lib/validation';
import ImageCropModal, { fetchImageAsDataUrl } from '@/components/ui/ImageCropModal';

interface ProfileEdit extends Profile {
  id: string;
  username: string;
  profile_description: string | null;
  avatar_url: string | null;
  default_theme?: ThemeId | null;
  default_unit?: string | null;
}

export default function ProfileEditPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<ProfileEdit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cropModalSrc, setCropModalSrc] = useState<string | null>(null);
  const [loadingCropSrc, setLoadingCropSrc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [username, setUsername] = useState('');
  const [description, setDescription] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>(DEFAULT_THEME);
  const [selectedUnit, setSelectedUnit] = useState<string>(DEFAULT_UNIT);
  const [selectedTemperatureUnit, setSelectedTemperatureUnit] =
    useState<TemperatureUnitValue>(DEFAULT_TEMPERATURE_UNIT);
  const [nutritionEnabled, setNutritionEnabled] = useState<boolean>(false);

  /**
   * Fetch user profile data
   */
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data as ProfileEdit;
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      return null;
    }
  };

  /**
   * Handle profile picture upload
   */
  const handleAvatarUpload = async (file: File) => {
    if (!user || !profile) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;
      
      // Delete old avatar files for this user (non-blocking cleanup)
      try {
        const { data: oldFiles } = await supabaseClient.storage
          .from('avatars')
          .list(user.id);
        
        if (oldFiles) {
          const avatarFiles = oldFiles.filter(f => f.name.startsWith('avatar.'));
          if (avatarFiles.length > 0) {
            const filesToDelete = avatarFiles
              .filter(f => f.name !== `avatar.${fileExt}`)
              .map(f => `${user.id}/${f.name}`);
            if (filesToDelete.length > 0) {
              await supabaseClient.storage
                .from('avatars')
                .remove(filesToDelete);
            }
          }
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup old avatar files:', cleanupError);
      }
      
      // Upload to avatars bucket
      const { error: uploadError } = await supabaseClient.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Image upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabaseClient.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        throw new Error(`Failed to update profile: ${updateError.message}`);
      }

      // Update local state
      setProfile({ ...profile, avatar_url: publicUrl });
      setAvatarPreview(null);
      
      // Dispatch event to notify header (and other components) that avatar was updated
      window.dispatchEvent(new CustomEvent('profileAvatarUpdated'));
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      alert(`Failed to upload avatar: ${err.message}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  /**
   * Handle file input change — open crop modal before uploading
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCropModalSrc(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !profile) return;
    
    setSaving(true);
    setUsernameError(null);
    
    try {
      const usernameResult = validateUsername(username);
      if (!usernameResult.ok) {
        setUsernameError(usernameResult.error);
        setSaving(false);
        return;
      }

      const descriptionResult = validateProfileDescription(description);
      if (!descriptionResult.ok) {
        setUsernameError(descriptionResult.error);
        setSaving(false);
        return;
      }
      const censoredDescription = descriptionResult.value.censored;

      // Check if username is already taken (if changed)
      if (usernameResult.value.trimmed !== profile.username) {
        const { data: existingProfile } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('username', usernameResult.value.trimmed)
          .neq('id', user.id)
          .single();
        
        if (existingProfile) {
          setUsernameError('Username is already taken');
          setSaving(false);
          return;
        }
      }
      
      // Update profile
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          username: usernameResult.value.trimmed,
          profile_description: censoredDescription || null,
          default_theme: selectedTheme,
          default_unit: selectedUnit,
          default_temperature_unit: selectedTemperatureUnit,
          nutrition_estimation_enabled: nutritionEnabled,
        })
        .eq('id', user.id);
      
      if (updateError) {
        throw new Error(`Failed to update profile: ${updateError.message}`);
      }
      
      // Update local state (use censored description)
      setProfile({
        ...profile,
        username: usernameResult.value.trimmed,
        profile_description: censoredDescription || null,
        default_theme: selectedTheme,
        default_unit: selectedUnit,
        default_temperature_unit: selectedTemperatureUnit,
        nutrition_estimation_enabled: nutritionEnabled,
      });
      
      // Update description state to show censored version
      setDescription(censoredDescription);
      
      // Dispatch event to notify header (and other components) that profile was updated
      window.dispatchEvent(new CustomEvent('profileUpdated'));
      
      // Redirect to profile page
      router.push('/profile');
    } catch (err: any) {
      console.error('Error updating profile:', err);
      alert(`Failed to update profile: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const getCurrentThemeMode = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    const savedThemeMode = localStorage.getItem('theme-mode') as 'light' | 'dark' | null;
    if (savedThemeMode) return savedThemeMode;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const applyThemePreview = (themeId: ThemeId, mode?: 'light' | 'dark') => {
    const resolvedMode = mode ?? getCurrentThemeMode();
    const daisyId = resolveDaisyThemeId(themeId, resolvedMode);
    const unified = getUnifiedTheme(themeId);
    document.documentElement.setAttribute('data-theme', daisyId);
    document.documentElement.setAttribute('data-theme-mode', resolvedMode);
    localStorage.setItem('guest-theme', themeId);
    if (unified) {
      document.documentElement.style.setProperty('--theme-image-color', unified.imageColor[resolvedMode]);
      document.documentElement.style.setProperty('--theme-bg-opacity', String(unified.bgOpacity[resolvedMode]));
    }
  };

  const handleSelectTheme = (themeId: ThemeId) => {
    setSelectedTheme(themeId);
    applyThemePreview(themeId);
  };

  /**
   * Initialize: Check auth and fetch data
   */
  useEffect(() => {
    const initialize = async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session?.user) {
          router.push('/login');
          return;
        }

        setUser(session.user);
        
        // Fetch profile
        const userProfile = await fetchProfile(session.user.id);
        if (!userProfile) {
          router.push('/login');
          return;
        }

        migrateGuestThemePrefs();

        setProfile(userProfile);
        setUsername(userProfile.username);
        setDescription(userProfile.profile_description || '');
        const savedTheme = (userProfile.default_theme as ThemeId) || DEFAULT_THEME;
        const defaultUnit = userProfile.default_unit || DEFAULT_UNIT;
        const defaultTempUnit =
          userProfile.default_temperature_unit === 'F' ? 'F' : DEFAULT_TEMPERATURE_UNIT;
        setSelectedTheme(savedTheme);
        setSelectedUnit(defaultUnit);
        setSelectedTemperatureUnit(defaultTempUnit);
        setNutritionEnabled(userProfile.nutrition_estimation_enabled === true);

        applyThemePreview(savedTheme);
      } catch (err) {
        console.error('Error initializing profile page:', err);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [router]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const displayAvatarUrl = avatarPreview || profile.avatar_url;

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4 sm:mb-6">
          <Link href="/profile" className="link link-primary text-sm sm:text-base">
            ← Back to Profile
          </Link>
        </div>
        
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8">Edit Profile</h1>
        
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body p-4 sm:p-6">
            <form onSubmit={handleSubmit}>
              {/* Avatar Section */}
              <div className="mb-6">
                <label className="label">
                  <span className="label-text font-semibold">Profile Picture</span>
                </label>
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  <div className="relative">
                    <div className="avatar">
                      <div className="w-24 rounded-full bg-base-300 ring ring-primary ring-offset-base-100 ring-offset-2">
                        {displayAvatarUrl ? (
                          <Image
                            src={displayAvatarUrl}
                            alt={profile.username}
                            width={96}
                            height={96}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-base-300 flex items-center justify-center">
                            <span className="text-2xl font-bold">
                              {profile.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Camera button — upload new image */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar || loadingCropSrc}
                      className="absolute bottom-0 right-0 btn btn-circle btn-primary btn-sm"
                      title="Upload new profile picture"
                    >
                      {uploadingAvatar ? (
                        <span className="loading loading-spinner loading-xs"></span>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      )}
                    </button>

                    {/* Edit/crop button — only visible when there is an existing image */}
                    {displayAvatarUrl && (
                      <button
                        type="button"
                        disabled={uploadingAvatar || loadingCropSrc}
                        onClick={async () => {
                          setLoadingCropSrc(true);
                          try {
                            const src = await fetchImageAsDataUrl(displayAvatarUrl);
                            setCropModalSrc(src);
                          } catch (err) {
                            console.error('Failed to load image for editing:', err);
                          } finally {
                            setLoadingCropSrc(false);
                          }
                        }}
                        className="absolute -bottom-0 -left-0 btn btn-circle btn-neutral btn-sm"
                        title="Edit / crop current picture"
                      >
                        {loadingCropSrc ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.293-6.293a1 1 0 011.414 0l1.586 1.586a1 1 0 010 1.414L12 16H9v-3z" />
                          </svg>
                        )}
                      </button>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                  <div>
                    <p className="text-sm opacity-70">
                      {displayAvatarUrl
                        ? 'Use the camera to upload a new photo, or the pencil to crop the current one'
                        : 'Click the camera icon to upload a profile picture'}
                    </p>
                  </div>
                </div>
              </div>

              {cropModalSrc && (
                <ImageCropModal
                  imageSrc={cropModalSrc}
                  aspect={1}
                  cropShape="round"
                  title="Edit Profile Picture"
                  onConfirm={(croppedFile, previewUrl) => {
                    setAvatarPreview(previewUrl);
                    setCropModalSrc(null);
                    handleAvatarUpload(croppedFile);
                  }}
                  onCancel={() => setCropModalSrc(null)}
                />
              )}

              {/* Username Field */}
              <div className="form-control mb-6">
                <label className="label">
                  <span className="label-text font-semibold">Username</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setUsernameError(null);
                  }}
                  className={`input input-bordered ${usernameError ? 'input-error' : ''}`}
                  required
                  minLength={USERNAME_MIN_LENGTH}
                  maxLength={USERNAME_MAX_LENGTH}
                />
                {usernameError && (
                  <label className="label">
                    <span className="label-text-alt text-error">{usernameError}</span>
                  </label>
                )}
              </div>

              {/* Description Field */}
              <div className="form-control mb-6">
                <label className="label">
                  <span className="label-text font-semibold">Profile Description</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="textarea textarea-bordered"
                  rows={4}
                  maxLength={PROFILE_DESCRIPTION_MAX_LENGTH}
                  placeholder="Tell us about yourself..."
                />
                <label className="label">
                  <span className="label-text-alt">{description.length}/500</span>
                </label>
              </div>

              {/* Theme Selection */}
              <div className="form-control mb-6">
                <label className="label">
                  <span className="label-text font-semibold text-lg">Color Theme</span>
                </label>
                <label className="label pt-0">
                  <span className="label-text-alt">Each swatch shows light mode (top) and dark mode (bottom)</span>
                </label>
                <ThemePicker selectedTheme={selectedTheme} onSelect={handleSelectTheme} />
              </div>

              {/* Default Unit of Measurement */}
              <div className="form-control mb-6">
                <label className="label">
                  <span className="label-text font-semibold text-lg">Default Unit of Measurement</span>
                </label>
                <label className="label">
                  <span className="label-text-alt">Pre-selected when creating new recipes</span>
                </label>
                <select
                  className="select select-bordered"
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
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

              {/* Default Temperature Unit */}
              <div className="form-control mb-6">
                <label className="label">
                  <span className="label-text font-semibold text-lg">Default Temperature Unit</span>
                </label>
                <label className="label">
                  <span className="label-text-alt">Used when viewing recipe temperatures</span>
                </label>
                <select
                  className="select select-bordered"
                  value={selectedTemperatureUnit}
                  onChange={(e) =>
                    setSelectedTemperatureUnit(e.target.value as TemperatureUnitValue)
                  }
                >
                  {TEMPERATURE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nutrition Estimation */}
              <div className="form-control mb-6">
                <label className="label cursor-pointer">
                  <span className="label-text font-semibold text-lg">Nutrition Estimation</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={nutritionEnabled}
                    onChange={(e) => setNutritionEnabled(e.target.checked)}
                  />
                </label>
                <div className="alert alert-warning mt-2">
                  <span className="text-sm">
                    Strictly experimental. When on, recipe pages show an approximate
                    calorie and macro breakdown estimated from ingredient amounts using
                    USDA nutrition values. Figures are rough and not a substitute for
                    professional dietary advice. Off by default.
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4">
                <Link href="/profile" className="btn btn-ghost w-full sm:w-auto">
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="btn btn-primary w-full sm:w-auto"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

