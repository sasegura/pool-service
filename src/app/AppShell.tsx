import { AppProviders } from './providers/AppProviders';
import { AppRouter } from './router/AppRouter';

export default function AppShell() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
