/**
 * Follow Service
 *
 * Client-side helpers for the follow graph backed by the `followers` table.
 * A row (follower_id, followee_id) means follower_id follows followee_id.
 *
 * Row Level Security guarantees a user can only insert/delete their own
 * follow rows, and a DB CHECK prevents following yourself.
 */

import { supabaseClient } from '@/lib/supabase-client';

export interface FollowCounts {
  followers: number;
  following: number;
}

/**
 * Follow a user. Safe to call when already following (ignores duplicate PK).
 */
export async function followUser(followeeId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  if (!user) return false;

  const { error } = await supabaseClient
    .from('followers')
    .insert({ follower_id: user.id, followee_id: followeeId });

  if (error) {
    // 23505 = unique violation (already following) — treat as success.
    if ((error as { code?: string }).code === '23505') return true;
    console.error('Error following user:', error);
    return false;
  }
  return true;
}

/**
 * Stop following a user.
 */
export async function unfollowUser(followeeId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  if (!user) return false;

  const { error } = await supabaseClient
    .from('followers')
    .delete()
    .eq('follower_id', user.id)
    .eq('followee_id', followeeId);

  if (error) {
    console.error('Error unfollowing user:', error);
    return false;
  }
  return true;
}

/**
 * Fetch follower / following counts for a profile.
 *
 * Reads the trigger-maintained counter columns on `profiles` (single-row
 * lookup) instead of scanning the `followers` table.
 */
export async function getFollowCounts(profileId: string): Promise<FollowCounts> {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('follower_count, following_count')
    .eq('id', profileId)
    .single();

  if (error || !data) {
    if (error) console.error('Error fetching follow counts:', error);
    return { followers: 0, following: 0 };
  }

  return {
    followers: data.follower_count ?? 0,
    following: data.following_count ?? 0,
  };
}

export interface FollowListUser {
  id: string;
  username: string;
  avatar_url: string | null;
  profile_description: string | null;
}

/**
 * Fetch the list of profiles in a follow relationship.
 *
 * @param profileId - The profile whose connections we want.
 * @param type - 'followers' = people who follow profileId,
 *               'following' = people profileId follows.
 */
export async function getFollowList(
  profileId: string,
  type: 'followers' | 'following'
): Promise<FollowListUser[]> {
  const column = type === 'followers' ? 'followee_id' : 'follower_id';
  const selectColumn = type === 'followers' ? 'follower_id' : 'followee_id';

  const { data: rows, error } = await supabaseClient
    .from('followers')
    .select(selectColumn)
    .eq(column, profileId)
    .order('created_at', { ascending: false });

  if (error || !rows || rows.length === 0) {
    if (error) console.error('Error fetching follow list:', error);
    return [];
  }

  const ids = rows.map((row) => (row as Record<string, string>)[selectColumn]);

  // No FK embed between followers and profiles (FK points at auth.users),
  // so resolve profiles in a second query — mirrors RecipeRatings pattern.
  const { data: profiles, error: profilesError } = await supabaseClient
    .from('profiles')
    .select('id, username, avatar_url, profile_description')
    .in('id', ids);

  if (profilesError || !profiles) {
    console.error('Error fetching follow list profiles:', profilesError);
    return [];
  }

  // Preserve the follow order (most recent first).
  const byId = new Map(
    (profiles as FollowListUser[]).map((profile) => [profile.id, profile])
  );
  return ids
    .map((id) => byId.get(id))
    .filter((profile): profile is FollowListUser => profile !== undefined);
}
