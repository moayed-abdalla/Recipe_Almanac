'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { AdminFeedbackItem } from '@/lib/admin-metrics';

const TYPES = ['all', 'bug', 'feature', 'other'] as const;

export default function AdminFeedbackClient({ items }: { items: AdminFeedbackItem[] }) {
  const [typeFilter, setTypeFilter] = useState<(typeof TYPES)[number]>('all');

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return items;
    return items.filter((i) => i.type === typeFilter);
  }, [items, typeFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold">Feedback</h1>
        <span className="text-sm opacity-70">
          {filtered.length} of {items.length}
        </span>
      </div>

      <div className="join">
        {TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className={`join-item btn btn-sm capitalize ${typeFilter === t ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTypeFilter(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="opacity-60">No feedback in this filter.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <article key={item.id} className="bg-base-200 rounded-lg p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge badge-outline capitalize">{item.type}</span>
                  {item.subject ? (
                    <h2 className="font-semibold">{item.subject}</h2>
                  ) : (
                    <h2 className="font-semibold opacity-60">(no subject)</h2>
                  )}
                </div>
                <time className="text-xs opacity-60" dateTime={item.created_at}>
                  {new Date(item.created_at).toLocaleString()}
                </time>
              </div>
              <p className="whitespace-pre-wrap text-sm">{item.description}</p>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {item.username ? (
                  <Link href={`/profile/${item.username}`} className="link link-hover">
                    @{item.username}
                  </Link>
                ) : (
                  <span className="opacity-60">Unknown user</span>
                )}
                {item.image_url ? (
                  <a
                    href={item.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link link-primary"
                  >
                    View attachment
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
