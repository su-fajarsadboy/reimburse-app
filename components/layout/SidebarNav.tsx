'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Wallet,
  ScrollText,
  BarChart3,
  Download,
  KeyRound,
  ShieldCheck,
  Settings,
} from '@/components/icons';

type Item = {
  href: (id: string) => string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  match: string;
};

const ITEMS: Item[] = [
  { href: (id) => `/dashboard/trip/${id}`, label: 'Transaksi', icon: Wallet, match: '$' },
  {
    href: (id) => `/dashboard/trip/${id}/approval`,
    label: 'Approval',
    icon: ShieldCheck,
    match: '/approval',
  },
  {
    href: (id) => `/dashboard/trip/${id}/settlement`,
    label: 'Settlement',
    icon: BarChart3,
    match: '/settlement',
  },
  {
    href: (id) => `/dashboard/trip/${id}/export`,
    label: 'Export',
    icon: Download,
    match: '/export',
  },
  {
    href: (id) => `/dashboard/trip/${id}/api-keys`,
    label: 'API Keys',
    icon: KeyRound,
    match: '/api-keys',
  },
  {
    href: (id) => `/dashboard/trip/${id}/audit-log`,
    label: 'Audit Log',
    icon: ScrollText,
    match: '/audit-log',
  },
  { href: (id) => `/dashboard/trip/${id}/setup`, label: 'Setup', icon: Settings, match: '/setup' },
];

export function SidebarNav({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border bg-bg-1 p-3 gap-1">
      <div className="px-3 py-3 text-sm font-semibold tracking-wide">Reimburse</div>
      {ITEMS.map(({ href, label, icon: Icon, match }) => {
        const isActive =
          match === '$'
            ? pathname === `/dashboard/trip/${tripId}`
            : pathname.startsWith(`/dashboard/trip/${tripId}${match}`);
        return (
          <Link
            key={label}
            href={href(tripId)}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
              isActive
                ? 'bg-primary-soft text-text-1'
                : 'text-text-2 hover:bg-bg-2 hover:text-text-1'
            }`}
          >
            <Icon size={16} />
            <span>{label}</span>
          </Link>
        );
      })}
    </aside>
  );
}
