import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth';
import { Topbar } from '@/components/layout/Topbar';
import { SetupWizard } from '@/components/trip/SetupWizard';

export default async function NewTripPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  return (
    <div className="min-h-screen flex flex-col">
      <Topbar crumb="Admin" title="Buat Trip Baru" />
      <SetupWizard />
    </div>
  );
}
