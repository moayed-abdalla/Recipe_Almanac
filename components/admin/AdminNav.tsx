'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin');
    router.refresh();
  };

  const linkClass = (href: string) =>
    `btn btn-sm ${pathname === href || pathname.startsWith(href + '/') ? 'btn-primary' : 'btn-ghost'}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-base-300">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-lg mr-2">Admin</span>
        <Link href="/admin/overview" className={linkClass('/admin/overview')}>
          Overview
        </Link>
        <Link href="/admin/feedback" className={linkClass('/admin/feedback')}>
          Feedback
        </Link>
      </div>
      <button type="button" className="btn btn-sm btn-outline" onClick={handleLogout}>
        Log out
      </button>
    </div>
  );
}
