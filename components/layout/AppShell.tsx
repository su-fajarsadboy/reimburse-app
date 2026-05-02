import { SidebarNav } from './SidebarNav';
import { BottomNav } from './BottomNav';

export function AppShell({
  tripId,
  children,
}: {
  tripId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <SidebarNav tripId={tripId} />
      <main className="flex-1 flex flex-col pb-16 md:pb-0">{children}</main>
      <BottomNav tripId={tripId} />
    </div>
  );
}
