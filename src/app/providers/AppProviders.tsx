import type { PropsWithChildren } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider } from '../../contexts/AuthContext';
import { AppServicesProvider } from './AppServicesContext';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <AuthProvider>
      <AppServicesProvider>{children}</AppServicesProvider>
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}
