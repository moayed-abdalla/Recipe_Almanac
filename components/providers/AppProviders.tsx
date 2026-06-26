'use client';

import { ProfileProvider } from '@/contexts/ProfileContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import ServiceWorkerRegister from '@/components/providers/ServiceWorkerRegister';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider>
      <ThemeProvider>
        <ServiceWorkerRegister />
        {children}
      </ThemeProvider>
    </ProfileProvider>
  );
}
