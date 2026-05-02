import { SidebarNav } from './SidebarNav';
import { BottomNav } from './BottomNav';

type Role = 'manager' | 'approver';

export function AppShell({
  tripId,
  role = 'manager',
  children,
}: {
  tripId: string;
  role?: Role;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <SidebarNav tripId={tripId} role={role} />
      <main className="flex-1 flex flex-col pb-16 md:pb-0">{children}</main>
      <BottomNav tripId={tripId} role={role} />
    </div>
  );
}
