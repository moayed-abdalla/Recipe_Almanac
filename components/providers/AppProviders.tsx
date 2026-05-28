'use client';

import { ProfileProvider } from '@/contexts/ProfileContext';
import ServiceWorkerRegister from '@/components/providers/ServiceWorkerRegister';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider>
      <ServiceWorkerRegister />
      {children}
    </ProfileProvider>
  );
}
