import { createAdminClient } from '@/lib/supabase';

export type MetricsRangeDays = 7 | 30 | 90;

export type DailyPoint = {
  date: string; // YYYY-MM-DD
  count: number;
};

export type AdminKpis = {
  totalUsers: number;
  publicRecipes: number;
  totalViews: number;
  totalFavorites: number;
  totalFeedback: number;
  totalRatings: number;
  totalRemakes: number;
  totalFollows: number;
};

export type FeedbackByType = {
  type: string;
  count: number;
};

export type TopRecipeRow = {
  id: string;
  slug: string;
  title: string;
  view_count: number;
  favorite_count: number;
  rating_count: number;
  avg_rating: number;
  creator_username: string;
};

export type TopCreatorRow = {
  id: string;
  username: string;
  follower_count: number;
  recipe_count: number;
};

export type AdminMetrics = {
  rangeDays: MetricsRangeDays;
  kpis: AdminKpis;
  series: {
    users: DailyPoint[];
    recipes: DailyPoint[];
    views: DailyPoint[];
    favorites: DailyPoint[];
    ratings: DailyPoint[];
    feedback: DailyPoint[];
    remakes: DailyPoint[];
    follows: DailyPoint[];
  };
  feedbackByType: FeedbackByType[];
  topRecipes: TopRecipeRow[];
  topCreators: TopCreatorRow[];
};

function parseRange(raw: string | undefined): MetricsRangeDays {
  if (raw === '7') return 7;
  if (raw === '90') return 90;
  return 30;
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function toDayKey(iso: string): string {
  return iso.slice(0, 10);
}

function emptySeries(rangeDays: MetricsRangeDays): DailyPoint[] {
  const end = startOfUtcDay(new Date());
  const points: DailyPoint[] = [];
  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i);
    points.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  return points;
}

function bucketTimestamps(timestamps: string[], rangeDays: MetricsRangeDays): DailyPoint[] {
  const series = emptySeries(rangeDays);
  const index = new Map(series.map((p, i) => [p.date, i]));
  for (const ts of timestamps) {
    const key = toDayKey(ts);
    const i = index.get(key);
    if (i !== undefined) {
      series[i]!.count += 1;
    }
  }
  return series;
}

function rangeStartIso(rangeDays: MetricsRangeDays): string {
  const end = startOfUtcDay(new Date());
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (rangeDays - 1));
  return start.toISOString();
}

async function countExact(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: PromiseLike<{ count: number | null; error: any }>
): Promise<number> {
  const { count, error } = await query;
  if (error) {
    console.error('Admin metrics count error:', error);
    return 0;
  }
  return count ?? 0;
}

async function fetchTimestamps(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: ReturnType<typeof createAdminClient>,
  table: string,
  column: string,
  since: string,
  filter?: { column: string; op: 'not.is'; value: null }
): Promise<string[]> {
  // Use untyped from() for tables not fully in Database type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (client as any).from(table).select(column).gte(column, since);
  if (filter?.op === 'not.is') {
    q = q.not(filter.column, 'is', filter.value);
  }
  const { data, error } = await q;
  if (error) {
    console.error(`Admin metrics ${table} fetch error:`, error);
    return [];
  }
  return ((data as Record<string, string>[] | null) ?? [])
    .map((row) => row[column])
    .filter((v): v is string => typeof v === 'string');
}

export async function getAdminMetrics(rangeParam?: string): Promise<AdminMetrics> {
  const rangeDays = parseRange(rangeParam);
  const since = rangeStartIso(rangeDays);
  const client = createAdminClient();

  const [
    totalUsers,
    publicRecipes,
    totalFavorites,
    totalFeedback,
    totalRatings,
    totalRemakes,
    totalFollows,
    viewsSumResult,
    userTs,
    recipeTs,
    viewTs,
    favoriteTs,
    ratingTs,
    feedbackTs,
    remakeTs,
    followTs,
    feedbackTypeRows,
    topRecipesRpc,
    topCreatorsResult,
    recipeCountsResult,
  ] = await Promise.all([
    countExact(client.from('profiles').select('*', { count: 'exact', head: true })),
    countExact(
      client.from('recipes').select('*', { count: 'exact', head: true }).eq('is_public', true)
    ),
    countExact(client.from('saved_recipes').select('*', { count: 'exact', head: true })),
    countExact(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (client as any).from('feedback').select('*', { count: 'exact', head: true })
    ),
    countExact(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (client as any).from('recipe_ratings').select('*', { count: 'exact', head: true })
    ),
    countExact(
      client
        .from('recipes')
        .select('*', { count: 'exact', head: true })
        .not('copied_from_recipe_id', 'is', null)
    ),
    countExact(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (client as any).from('followers').select('*', { count: 'exact', head: true })
    ),
    client.from('recipes').select('view_count'),
    fetchTimestamps(client, 'profiles', 'created_at', since),
    fetchTimestamps(client, 'recipes', 'created_at', since),
    fetchTimestamps(client, 'recipe_views', 'viewed_at', since),
    fetchTimestamps(client, 'saved_recipes', 'saved_at', since),
    fetchTimestamps(client, 'recipe_ratings', 'created_at', since),
    fetchTimestamps(client, 'feedback', 'created_at', since),
    fetchTimestamps(client, 'recipes', 'created_at', since, {
      column: 'copied_from_recipe_id',
      op: 'not.is',
      value: null,
    }),
    fetchTimestamps(client, 'followers', 'created_at', since),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client as any).from('feedback').select('type'),
    client.rpc('get_leaderboard_recipes', { p_limit: 10 }),
    client
      .from('profiles')
      .select('id, username, follower_count')
      .order('follower_count', { ascending: false })
      .limit(10),
    client.from('recipes').select('user_id').eq('is_public', true),
  ]);

  let totalViews = 0;
  if (!viewsSumResult.error && viewsSumResult.data) {
    for (const row of viewsSumResult.data) {
      totalViews += row.view_count ?? 0;
    }
  }

  const typeCounts = new Map<string, number>();
  if (!feedbackTypeRows.error && feedbackTypeRows.data) {
    for (const row of feedbackTypeRows.data as { type: string }[]) {
      typeCounts.set(row.type, (typeCounts.get(row.type) ?? 0) + 1);
    }
  }
  const feedbackByType: FeedbackByType[] = ['bug', 'feature', 'other'].map((type) => ({
    type,
    count: typeCounts.get(type) ?? 0,
  }));
  for (const [type, count] of typeCounts) {
    if (!['bug', 'feature', 'other'].includes(type)) {
      feedbackByType.push({ type, count });
    }
  }

  const recipeCountByUser = new Map<string, number>();
  if (!recipeCountsResult.error && recipeCountsResult.data) {
    for (const row of recipeCountsResult.data) {
      recipeCountByUser.set(row.user_id, (recipeCountByUser.get(row.user_id) ?? 0) + 1);
    }
  }

  const topCreators: TopCreatorRow[] = (topCreatorsResult.data ?? []).map((p) => ({
    id: p.id,
    username: p.username,
    follower_count: p.follower_count ?? 0,
    recipe_count: recipeCountByUser.get(p.id) ?? 0,
  }));

  const topRecipes: TopRecipeRow[] = (topRecipesRpc.data ?? []).map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    view_count: r.view_count ?? 0,
    favorite_count: r.favorite_count ?? 0,
    rating_count: r.rating_count ?? 0,
    avg_rating: r.average_rating ?? 0,
    creator_username: r.username ?? '',
  }));

  return {
    rangeDays,
    kpis: {
      totalUsers,
      publicRecipes,
      totalViews,
      totalFavorites,
      totalFeedback,
      totalRatings,
      totalRemakes,
      totalFollows,
    },
    series: {
      users: bucketTimestamps(userTs, rangeDays),
      recipes: bucketTimestamps(recipeTs, rangeDays),
      views: bucketTimestamps(viewTs, rangeDays),
      favorites: bucketTimestamps(favoriteTs, rangeDays),
      ratings: bucketTimestamps(ratingTs, rangeDays),
      feedback: bucketTimestamps(feedbackTs, rangeDays),
      remakes: bucketTimestamps(remakeTs, rangeDays),
      follows: bucketTimestamps(followTs, rangeDays),
    },
    feedbackByType,
    topRecipes,
    topCreators,
  };
}

export type AdminFeedbackItem = {
  id: string;
  type: string;
  subject: string | null;
  description: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  username: string | null;
};

export async function getAllFeedback(): Promise<AdminFeedbackItem[]> {
  const client = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('feedback')
    .select('id, type, subject, description, image_url, created_at, user_id')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Admin feedback fetch error:', error);
    return [];
  }

  const rows = (data ?? []) as Omit<AdminFeedbackItem, 'username'>[];
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const usernameById = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profiles } = await client
      .from('profiles')
      .select('id, username')
      .in('id', userIds);
    for (const p of profiles ?? []) {
      usernameById.set(p.id, p.username);
    }
  }

  return rows.map((r) => ({
    ...r,
    username: usernameById.get(r.user_id) ?? null,
  }));
}
