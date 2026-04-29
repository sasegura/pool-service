import type { PropsWithChildren } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider } from '../../contexts/AuthContext';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <AuthProvider>
      {children}
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}
