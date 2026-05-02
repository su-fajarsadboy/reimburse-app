import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth';
import { AppShell } from '@/components/layout/AppShell';
import { loadTripContext } from '@/lib/services/trip-loader';

export default async function TripLayout({
  children, params,
}: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  const { id } = await params;
  await loadTripContext(id, session.user.id);
  return <AppShell tripId={id}>{children}</AppShell>;
}
