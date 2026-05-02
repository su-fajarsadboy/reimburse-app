'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wallet, ShieldCheck, BarChart3, Download } from '@/components/icons';

const ITEMS = [
  { href: (id: string) => `/dashboard/trip/${id}`, label: 'Transaksi', icon: Wallet, match: '$' },
  {
    href: (id: string) => `/dashboard/trip/${id}/approval`,
    label: 'Approval',
    icon: ShieldCheck,
    match: '/approval',
  },
  {
    href: (id: string) => `/dashboard/trip/${id}/settlement`,
    label: 'Settle',
    icon: BarChart3,
    match: '/settlement',
  },
  {
    href: (id: string) => `/dashboard/trip/${id}/export`,
    label: 'Export',
    icon: Download,
    match: '/export',
  },
];

export function BottomNav({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-bg-1 border-t border-border flex z-40">
      {ITEMS.map(({ href, label, icon: Icon, match }) => {
        const isActive =
          match === '$'
            ? pathname === `/dashboard/trip/${tripId}`
            : pathname.startsWith(`/dashboard/trip/${tripId}${match}`);
        return (
          <Link
            key={label}
            href={href(tripId)}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs ${isActive ? 'text-text-1' : 'text-text-3'}`}
          >
            <Icon size={18} />
            <span style={{ fontSize: 10 }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
