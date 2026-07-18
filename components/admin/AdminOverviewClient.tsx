'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AdminMetrics, DailyPoint } from '@/lib/admin-metrics';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const CHART_COLORS = [
  'oklch(var(--p))',
  'oklch(var(--s))',
  'oklch(var(--a))',
  'oklch(var(--in))',
  'oklch(var(--su))',
  'oklch(var(--wa))',
  'oklch(var(--er))',
  '#8884d8',
];

function SeriesChart({ title, data }: { title: string; data: DailyPoint[] }) {
  return (
    <div className="bg-base-200 rounded-lg p-4">
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickFormatter={(v: string) => v.slice(5)}
              interval="preserveStartEnd"
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--fallback-b1,oklch(var(--b1)))',
                border: '1px solid var(--fallback-bc,oklch(var(--bc)/0.2))',
                borderRadius: 8,
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="oklch(var(--p))"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat bg-base-200 rounded-lg p-4">
      <div className="stat-title text-xs sm:text-sm">{label}</div>
      <div className="stat-value text-2xl sm:text-3xl">{value.toLocaleString()}</div>
    </div>
  );
}

export default function AdminOverviewClient({ metrics }: { metrics: AdminMetrics }) {
  const router = useRouter();

  const setRange = (days: number) => {
    router.push(`/admin/overview?range=${days}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold">Overview</h1>
        <div className="join">
          {([7, 30, 90] as const).map((d) => (
            <button
              key={d}
              type="button"
              className={`join-item btn btn-sm ${metrics.rangeDays === d ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setRange(d)}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Users" value={metrics.kpis.totalUsers} />
        <KpiCard label="Public recipes" value={metrics.kpis.publicRecipes} />
        <KpiCard label="Total views" value={metrics.kpis.totalViews} />
        <KpiCard label="Favorites" value={metrics.kpis.totalFavorites} />
        <KpiCard label="Ratings" value={metrics.kpis.totalRatings} />
        <KpiCard label="Remakes" value={metrics.kpis.totalRemakes} />
        <KpiCard label="Follows" value={metrics.kpis.totalFollows} />
        <KpiCard label="Feedback" value={metrics.kpis.totalFeedback} />
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-4">
          Activity (last {metrics.rangeDays} days)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SeriesChart title="New users" data={metrics.series.users} />
          <SeriesChart title="New recipes" data={metrics.series.recipes} />
          <SeriesChart title="Views" data={metrics.series.views} />
          <SeriesChart title="Favorites" data={metrics.series.favorites} />
          <SeriesChart title="Ratings" data={metrics.series.ratings} />
          <SeriesChart title="Feedback" data={metrics.series.feedback} />
          <SeriesChart title="Remakes / forks" data={metrics.series.remakes} />
          <SeriesChart title="Follows" data={metrics.series.follows} />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-base-200 rounded-lg p-4">
          <h3 className="font-semibold mb-3">Feedback by type</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.feedbackByType}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(props) => {
                    const type = String(props.name ?? '');
                    const count = Number(props.value ?? 0);
                    return count > 0 ? `${type}: ${count}` : '';
                  }}
                >
                  {metrics.feedbackByType.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-base-200 rounded-lg p-4">
          <h3 className="font-semibold mb-3">Feedback volume by type</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.feedbackByType}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="type" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="oklch(var(--p))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-base-200 rounded-lg p-4 overflow-x-auto">
          <h3 className="font-semibold mb-3">Top recipes</h3>
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Recipe</th>
                <th>Views</th>
                <th>Favs</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {metrics.topRecipes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="opacity-60">
                    No recipes yet
                  </td>
                </tr>
              ) : (
                metrics.topRecipes.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/recipe/${r.slug}`} className="link link-hover">
                        {r.title}
                      </Link>
                      <div className="text-xs opacity-60">@{r.creator_username}</div>
                    </td>
                    <td>{r.view_count}</td>
                    <td>{r.favorite_count}</td>
                    <td>
                      {r.avg_rating > 0 ? r.avg_rating.toFixed(1) : '—'}
                      {r.rating_count > 0 ? (
                        <span className="text-xs opacity-60"> ({r.rating_count})</span>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-base-200 rounded-lg p-4 overflow-x-auto">
          <h3 className="font-semibold mb-3">Top creators</h3>
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Creator</th>
                <th>Followers</th>
                <th>Recipes</th>
              </tr>
            </thead>
            <tbody>
              {metrics.topCreators.length === 0 ? (
                <tr>
                  <td colSpan={3} className="opacity-60">
                    No creators yet
                  </td>
                </tr>
              ) : (
                metrics.topCreators.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/profile/${c.username}`} className="link link-hover">
                        @{c.username}
                      </Link>
                    </td>
                    <td>{c.follower_count}</td>
                    <td>{c.recipe_count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
