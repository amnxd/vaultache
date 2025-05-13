
import { AppProvider } from '@/contexts/AppContext';
import { AppLayout } from '@/components/secure-stash/AppLayout';

export default function SecureStashPage() {
  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
}
