'use client';

import { ProfileProvider } from '@/contexts/ProfileContext';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return <ProfileProvider>{children}</ProfileProvider>;
}
