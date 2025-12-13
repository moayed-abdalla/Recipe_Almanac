/**
 * Profile Edit Page Component
 * 
 * Allows the authenticated user to edit their profile:
 * - Profile picture upload/change
 * - Username editing
 * - Profile description editing
 * 
 * This is a Client Component because it needs to:
 * - Access user authentication state
 * - Handle profile picture uploads
 * - Handle form submissions
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import Image from 'next/image';
import Link from 'next/link';

interface Profile {
  id: string;
  username: string;
  profile_description: string | null;
  avatar_url: string | null;
}

export default function ProfileEditPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [username, setUsername] = useState('');
  const [description, setDescription] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);

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

      return data as Profile;
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
   * Handle file input change
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Preview image
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Upload the file
      handleAvatarUpload(file);
    }
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
      // Check if username is already taken (if changed)
      if (username !== profile.username) {
        const { data: existingProfile } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('username', username)
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
          username: username.trim(),
          profile_description: description.trim() || null,
        })
        .eq('id', user.id);
      
      if (updateError) {
        throw new Error(`Failed to update profile: ${updateError.message}`);
      }
      
      // Update local state
      setProfile({
        ...profile,
        username: username.trim(),
        profile_description: description.trim() || null,
      });
      
      // Show success message
      alert('Profile updated successfully!');
      
      // Redirect to user's profile page
      router.push(`/user/${username.trim()}`);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      alert(`Failed to update profile: ${err.message}`);
    } finally {
      setSaving(false);
    }
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

        setProfile(userProfile);
        setUsername(userProfile.username);
        setDescription(userProfile.profile_description || '');
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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href={`/user/${profile.username}`} className="link link-primary">
            ← Back to Profile
          </Link>
        </div>
        
        <h1 className="text-4xl font-bold mb-8">Edit Profile</h1>
        
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              {/* Avatar Section */}
              <div className="mb-6">
                <label className="label">
                  <span className="label-text font-semibold">Profile Picture</span>
                </label>
                <div className="flex items-center gap-4">
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
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="absolute bottom-0 right-0 btn btn-circle btn-primary btn-sm"
                      title="Change profile picture"
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
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                  <div>
                    <p className="text-sm opacity-70">Click the camera icon to change your profile picture</p>
                  </div>
                </div>
              </div>

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
                  minLength={3}
                  maxLength={30}
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
                  maxLength={500}
                  placeholder="Tell us about yourself..."
                />
                <label className="label">
                  <span className="label-text-alt">{description.length}/500</span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-4">
                <Link href={`/user/${profile.username}`} className="btn btn-ghost">
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="btn btn-primary"
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
